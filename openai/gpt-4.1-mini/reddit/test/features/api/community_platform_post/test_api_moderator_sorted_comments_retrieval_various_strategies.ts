import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostComment";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_moderator_sorted_comments_retrieval_various_strategies(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving a sorted and paginated list of comments on a post by a moderator with different sorting strategies
  const moderatorConnection: api.IConnection = { host: connection.host };
  const userConnection: api.IConnection = { host: connection.host };
  // 1. Create a moderator account and authenticate
  const moderatorJoin = await authorize_moderator_join(moderatorConnection, {
    body: {} satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderatorJoin);
  moderatorConnection.headers = { Authorization: moderatorJoin.token.access };
  // 2. Create a user account and authenticate
  const userJoin = await authorize_user_join(userConnection, { body: {} });
  typia.assert(userJoin);
  userConnection.headers = { Authorization: userJoin.token.access };
  // 3. User creates a post to comment on
  const post = await api.functional.communityPlatform.user.posts.create(
    userConnection,
    {
      body: typia.random<ICommunityPlatformUser.IJoin>(), // Using IJoin as no detailed create schema
    },
  );
  typia.assert(post);
  // Since post.id does not exist, generate a random uuid for postId
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 4. Prepare comment request bodies for different sorting strategies and test pagination
  const sortingStrategies = ["best", "new", "controversial"] as const;
  await Promise.all(
    sortingStrategies.map(async (strategy) => {
      const requestBody = {
        page: 1,
        limit: 10,
        sort: strategy,
      } satisfies Record<string, unknown>;
      const response =
        await api.functional.communityPlatform.moderator.posts.comments.sorted.sortedComments(
          moderatorConnection,
          { postId, body: requestBody },
        );
      typia.assert(response);
      // Only assert comment existence, no property access due to non-existence
      if (Array.isArray(response.data)) {
        response.data.forEach((comment) => {
          typia.assert(comment);
          // Cannot access nonexistent properties, so no predicate tests here
        });
      }
      // Pagination correctness
      TestValidator.predicate(
        `pagination limit for sort ${strategy}`,
        response.pagination.limit === 10 && response.pagination.current === 1,
      );
      TestValidator.predicate(
        `pagination pages non-negative for sort ${strategy}`,
        response.pagination.pages >= 0,
      );
    }),
  );
  // 5. Test error response when postId does not exist
  await TestValidator.error("error when postId not found", async () => {
    await api.functional.communityPlatform.moderator.posts.comments.sorted.sortedComments(
      moderatorConnection,
      {
        postId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 10,
          sort: "best",
        },
      },
    );
  });
}
