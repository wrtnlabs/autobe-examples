import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPostVoteOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteOfUser";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostVoteOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVoteOfUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_post_vote_listing_filtered_by_post_id(
  connection: api.IConnection,
) {
  // Prepare a new user for authorization
  const userJoinConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userJoinConnection, {});
  // Create a user connection with authorization token
  const userConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorizedUser.token.access },
  };
  // Prepare a request body with postId that will filter the votes
  // Since we don't have a post creation API here, we'll generate a random postId
  // and simulate expecting that all votes returned correspond to this postId
  const postId = typia.random<string & tags.Format<"uuid">>();
  // For positive test, request votes filtered by postId
  // We'll request pagination with limit 3 to check pagination behavior
  const requestBody: ICommunityPlatformPostVoteOfUser.IRequest = {
    postId,
    limit: 3,
    page: 1,
  };
  // Call the API endpoint to get filtered user post votes
  const response =
    await api.functional.communityPlatform.user.postVotes.users.index(
      userConnection,
      { body: requestBody },
    );
  typia.assert(response);
  // Validate that all votes returned have the same postVoteId as the filter postId
  response.data.forEach((vote) => {
    TestValidator.equals("postVoteId matches filter", vote.postVoteId, postId);
    TestValidator.predicate(
      "valid voteType",
      typeof vote.voteType === "string" && vote.voteType.length > 0,
    );
  });
  // Validate pagination consistency
  TestValidator.predicate(
    "pagination.current is page 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination.limit is 3",
    response.pagination.limit === 3,
  );
  TestValidator.predicate(
    "pagination.pages >= 0",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination.records >= 0",
    response.pagination.records >= 0,
  );
  // Negative test: unauthorized user should be rejected
  const unauthorizedConnection: api.IConnection = { host: connection.host }; // no auth header
  await TestValidator.error("unauthorized access", async () => {
    await api.functional.communityPlatform.user.postVotes.users.index(
      unauthorizedConnection,
      { body: requestBody },
    );
  });
}
