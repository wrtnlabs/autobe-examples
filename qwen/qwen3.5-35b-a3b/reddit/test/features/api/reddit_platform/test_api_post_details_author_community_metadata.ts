import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostEngagementStat";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_details_author_community_metadata(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  // Scenario 1: Get post with active author and community with icon
  const postWithActiveAuthor = await api.functional.redditPlatform.posts.at(
    adminConnection,
    {
      postId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(postWithActiveAuthor);
  // Validate author metadata structure
  TestValidator.equals(
    "author username exists",
    postWithActiveAuthor.author.username.length > 0,
    true,
  );
  TestValidator.equals(
    "author display_name exists",
    postWithActiveAuthor.author.display_name.length > 0,
    true,
  );
  TestValidator.predicate(
    "author karma_score is valid int32",
    postWithActiveAuthor.author.karma_score >= -2147483648 &&
      postWithActiveAuthor.author.karma_score <= 2147483647,
  );
  TestValidator.equals(
    "author is_active flag is boolean",
    typeof postWithActiveAuthor.author.is_active === "boolean",
    true,
  );
  // Validate community metadata structure
  TestValidator.equals(
    "community name exists",
    postWithActiveAuthor.community.name.length > 0,
    true,
  );
  TestValidator.predicate(
    "community icon_url is string or null",
    postWithActiveAuthor.community.icon_url === null ||
      typeof postWithActiveAuthor.community.icon_url === "string",
  );
  TestValidator.predicate(
    "community subscriber_count is valid int32",
    postWithActiveAuthor.community.subscriber_count >= 0,
  );
  // Scenario 2: Soft-deleted post returns 404
  await TestValidator.httpError(
    "soft-deleted post returns 404",
    404,
    async () => {
      const deletedPostId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.redditPlatform.posts.at(adminConnection, {
        postId: deletedPostId,
      });
    },
  );
  // Scenario 3: Non-existent post returns 404
  await TestValidator.httpError(
    "non-existent post returns 404",
    404,
    async () => {
      const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.redditPlatform.posts.at(adminConnection, {
        postId: nonExistentPostId,
      });
    },
  );
}
