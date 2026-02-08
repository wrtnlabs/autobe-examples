import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_post_home_feed_retrieval_authenticated_user(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving the Home Feed posts for an authenticated user.
  // This test registers a new user to get auth,
  // then requests the home feed posts filtered by subscribed communities,
  // sorted by Hot with pagination, and validates results structure and correctness.
  // 1. Register (join) to get authenticated connection
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {
    body: {}, // ICommunityPlatformUser.IJoin is empty type
  });
  typia.assert(authorized);
  // Attach Authorization token to headers
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Request the Home Feed posts - this is PATCH /communityPlatform/user/posts
  // Prepare body according to ICommunityPlatformPost.IRequest
  // Since the DTO is empty, request body is empty object
  // We simulate filters by typical expected structure (though no schema fields given)
  // Actually, per DTO definition, ICommunityPlatformPost.IRequest is empty type {},
  // meaning no properties available. So send empty body.
  const requestBody: ICommunityPlatformPost.IRequest = {};
  // Perform the request
  const response = await api.functional.communityPlatform.user.posts.index(
    userConnection,
    {
      body: requestBody,
    },
  );
  // Validate the response structure
  typia.assert(response);
  // Check pagination metadata correctness
  const pagination = response.pagination;
  TestValidator.predicate("current page >= 0", pagination.current >= 0);
  TestValidator.predicate("limit >= 0", pagination.limit >= 0);
  TestValidator.predicate("records >= 0", pagination.records >= 0);
  TestValidator.predicate("pages >= 0", pagination.pages >= 0);
  // Check that number of data items does not exceed limit
  TestValidator.predicate(
    "data length within limit",
    response.data.length <= pagination.limit,
  );
  // For each post, validate vote score and comment count
  for (const post of response.data) {
    typia.assert(post);
    // vote_score and comment_count should be numbers (likely included in ISummary)
    // Because detailed properties are unknown (empty namespace), just check numbers
    if ("vote_score" in post) {
      TestValidator.predicate(
        "vote_score is number",
        typeof (post as any).vote_score === "number",
      );
    }
    if ("comment_count" in post) {
      TestValidator.predicate(
        "comment_count is number",
        typeof (post as any).comment_count === "number",
      );
    }
  }
  // 3. Test unauthorized access returns error
  // Use base connection without auth header
  await TestValidator.httpError(
    "unauthenticated access forbidden",
    401,
    async () => {
      await api.functional.communityPlatform.user.posts.index(connection, {
        body: requestBody,
      });
    },
  );
}
