import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_post_comments_new_sort_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);
  // Note: Since we don't have API functions to create posts and comments,
  // we'll test the endpoint with a random postId and validate the response structure
  // and pagination functionality
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Test pagination with different parameters
  const testCases = [
    { page: 1, limit: 5 },
    { page: 2, limit: 3 },
    { page: 1, limit: 10 },
  ] as const;
  for (const { page, limit } of testCases) {
    const response =
      await api.functional.communityPlatform.moderator.posts.comments.sorted.index(
        moderatorConnection,
        {
          postId,
          body: {
            sort: "new" as const,
            page: page satisfies number as number,
            limit: limit satisfies number as number,
          } satisfies ICommunityPlatformComment.IRequest,
        },
      );
    typia.assert(response);
    // Validate pagination metadata
    TestValidator.equals(
      "current page matches",
      response.pagination.current,
      page,
    );
    TestValidator.equals("limit matches", response.pagination.limit, limit);
    TestValidator.predicate(
      "records is non-negative",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pages is non-negative",
      response.pagination.pages >= 0,
    );
    // Validate chronological order (newest first) if we have multiple comments
    if (response.data.length > 1) {
      for (let i = 1; i < response.data.length; i++) {
        const currentComment = response.data[i];
        const previousComment = response.data[i - 1];
        TestValidator.predicate(
          `comment ${i} should be older than or equal to comment ${i - 1}`,
          new Date(currentComment.created_at) <=
            new Date(previousComment.created_at),
        );
      }
    }
  }
}
