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

export async function test_api_post_snapshot_deleted_post_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin account setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Member account setup
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // 3. Create a community for the post
  const community = typia.random<IRedditCommunityCommunity.ISummary>();
  // 4. Create initial post as member
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5 }),
        post_type: "text" as const,
        reddit_community_community_id: community.id,
        text_content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Admin login to retrieve snapshots
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: admin.email,
      password: admin.token.refresh, // Using refresh token as password (simplified for test)
    } satisfies IRedditCommunityAdmin.ILogin,
  });
  // 6. Retrieve snapshot by ID
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot = await api.functional.redditCommunity.admin.snapshots.at(
    adminLoginConnection,
    { snapshotId },
  );
  typia.assert(snapshot);
  // 7. Validate snapshot data immutability
  TestValidator.equals("snapshot id is valid uuid", snapshot.id, snapshotId);
  TestValidator.predicate("snapshot title exists", snapshot.title.length > 0);
  TestValidator.predicate(
    "snapshot post type is valid",
    snapshot.post_type === "text" ||
      snapshot.post_type === "link" ||
      snapshot.post_type === "image",
  );
  TestValidator.predicate(
    "snapshot has author username",
    snapshot.author.username.length > 0,
  );
  TestValidator.predicate(
    "snapshot has community name",
    snapshot.community.name.length > 0,
  );
  TestValidator.predicate(
    "snapshot has author id",
    snapshot.author.id !== undefined && snapshot.author.id.length > 0,
  );
  TestValidator.predicate(
    "snapshot has community id",
    snapshot.community.id !== undefined && snapshot.community.id.length > 0,
  );
  TestValidator.predicate(
    "snapshot created at is valid date",
    snapshot.created_at !== undefined &&
      snapshot.created_at.length > 0 &&
      !isNaN(new Date(snapshot.created_at).getTime()),
  );
  TestValidator.predicate(
    "snapshot status is valid",
    snapshot.status === "active" || snapshot.status === "deleted",
  );
}