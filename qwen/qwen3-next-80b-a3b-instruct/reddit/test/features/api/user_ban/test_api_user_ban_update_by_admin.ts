import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSection";
import type { ICommunityBbsUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserBan";
import { prepare_random_community_bbs_community } from "../../../prepare/prepare_random_community_bbs_community";
import { prepare_random_community_bbs_user_ban } from "../../../prepare/prepare_random_community_bbs_user_ban";
import { prepare_random_community_bbs_post } from "../../../prepare/prepare_random_community_bbs_post";
import { generate_random_community_bbs_member_posts_create } from "../../../generate/generate_random_community_bbs_member_posts_create";
import { generate_random_community_bbs_member_communities_create } from "../../../generate/generate_random_community_bbs_member_communities_create";
import { generate_random_community_bbs_admin_users_bans_create } from "../../../generate/generate_random_community_bbs_admin_users_bans_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_user_ban_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate admin to gain ban management permissions
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Authenticate and create a member who will be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsMember.IJoin,
  });
  typia.assert(member);
  // Step 3: Create a community to establish context for the ban
  const community =
    await generate_random_community_bbs_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // Step 4: Create a post by the member to establish their activity
  const post = await generate_random_community_bbs_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: typia.random<string>(),
      } satisfies ICommunityBbsPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 5: Create an initial ban on the member by admin using adminConnection
  const initialBan =
    await generate_random_community_bbs_admin_users_bans_create(
      adminConnection,
      {
        body: {
          userId: member.id,
          reason: "Initial violation of community guidelines",
        } satisfies ICommunityBbsUserBan.ICreate,
      },
    );
  typia.assert(initialBan);
  // Step 6: Store original creation timestamp for validation
  const originalCreatedAt = initialBan.created_at;
  // Step 7: Admin updates the ban with new expiration and reason
  const expectedExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const expectedExpiresAtStr =
    expectedExpiresAt.toISOString().slice(0, 19) + "Z";
  const updatedBan = await api.functional.communityBbs.admin.users.bans.update(
    adminConnection,
    {
      body: {
        expiresAt: expectedExpiresAtStr, // Use truncated string for exact match
        reason: "Extended suspension for repeated violations",
      } satisfies ICommunityBbsUserBan.IUpdate,
    },
  );
  typia.assert(updatedBan);
  // Step 8: Validate the update
  // Verify new expiration date is set with exact match
  TestValidator.equals(
    "updated ban expires at new date",
    updatedBan.expires_at,
    expectedExpiresAtStr,
  );
  // Verify reason was updated
  TestValidator.equals(
    "updated ban reason",
    updatedBan.reason,
    "Extended suspension for repeated violations",
  );
  // Verify original creation timestamp was preserved
  TestValidator.equals(
    "original creation timestamp preserved",
    updatedBan.created_at,
    originalCreatedAt,
  );
  // Verify ban remains active
  TestValidator.predicate(
    "ban remains active after update",
    updatedBan.is_active === true,
  );
  // Verify user info is unchanged
  TestValidator.equals("user info unchanged", updatedBan.user.id, member.id);
  // Verify admin info is unchanged
  TestValidator.equals(
    "admin info unchanged",
    updatedBan.bannedBy.id,
    admin.id,
  );
}