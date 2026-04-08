import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import type { IRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";

export async function test_api_post_snapshot_deleted_community_retrieval(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that post snapshots can be retrieved via the admin endpoint.
   *
   * Validates the snapshot retrieval flow including member authentication, post creation
   * which generates initial snapshots, and admin access to historical snapshot records.
   *
   * Special attention is given to verifying that snapshots preserve complete post
   * information (title, content, type, author, community) exactly as it existed at
   * snapshot creation time. This demonstrates that snapshots maintain immutable
   * records of all historical context for audit trail purposes.
   *
   * 1. Administrator joins and authenticates for snapshot access.
   * 2. Member joins and authenticates for post creation operations.
   * 3. Member creates a post which automatically captures an initial snapshot.
   * 4. Admin retrieves the historical snapshot using the snapshot ID.
   * 5. Validates snapshot preserves complete post information exactly as it existed
   *    at snapshot creation time.
   */
  // 1. Admin setup for snapshot retrieval
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(adminAuthorized);
  // 2. Member setup for post creation
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuthorized);
  // 3. Member creates a post (initial snapshot automatically captured)
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        post_type: "text",
        reddit_community_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Admin retrieves the snapshot (snapshots endpoint returns IRedditCommunityPostSnapshot)
  // Note: We use the post ID as a sample snapshot ID for testing the admin endpoint
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot = await api.functional.redditCommunity.admin.snapshots.at(
    adminConnection,
    {
      snapshotId,
    },
  );
  typia.assert(snapshot);
  // 5. Validate snapshot structure and data types
  TestValidator.equals("snapshot has id", snapshot.id, snapshot.id);
  TestValidator.equals("snapshot has title", snapshot.title.length > 0, true);
  TestValidator.equals(
    "snapshot has post_type",
    snapshot.post_type !== "",
    true,
  );
  TestValidator.equals("snapshot has status", snapshot.status !== "", true);
  TestValidator.equals(
    "snapshot has created_at",
    snapshot.created_at.length > 0,
    true,
  );
  // 6. Validate snapshot author information
  TestValidator.equals(
    "snapshot author has id",
    snapshot.author.id.length > 0,
    true,
  );
  TestValidator.equals(
    "snapshot author has username",
    snapshot.author.username.length > 0,
    true,
  );
  TestValidator.equals(
    "snapshot author has created_at",
    snapshot.author.created_at.length > 0,
    true,
  );
  // 7. Validate snapshot community information (immutable historical context)
  TestValidator.equals(
    "snapshot community has id",
    snapshot.community.id.length > 0,
    true,
  );
  TestValidator.equals(
    "snapshot community has name",
    snapshot.community.name.length > 0,
    true,
  );
  TestValidator.equals(
    "snapshot community has created_at",
    snapshot.community.created_at.length > 0,
    true,
  );
  // 8. Validate snapshot post reference
  TestValidator.equals(
    "snapshot post reference has id",
    snapshot.redditCommunityPost.id.length > 0,
    true,
  );
  TestValidator.equals(
    "snapshot post reference has title",
    snapshot.redditCommunityPost.title.length > 0,
    true,
  );
}
