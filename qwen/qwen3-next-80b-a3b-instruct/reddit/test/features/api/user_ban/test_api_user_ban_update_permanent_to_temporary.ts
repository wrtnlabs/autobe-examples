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
export async function test_api_user_ban_update_permanent_to_temporary(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create actor-specific connections for admin and member
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsAdmin.IJoin,
  });
  typia.assert(adminAuth);
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsMember.IJoin,
  });
  typia.assert(memberAuth);
  // Step 2: Create a community to establish context
  const community =
    await generate_random_community_bbs_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 3: Create a post to establish user context (this creates content that can be associated with the user)
  const post = await generate_random_community_bbs_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        community_id: community.id,
        post_type: "text",
      } satisfies ICommunityBbsPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 4: Create a permanent ban (expires_at = null) on the member's account
  // Extract the member ID from the response of authorize_member_join
  const memberId = memberAuth.id;
  const permanentBan =
    await generate_random_community_bbs_admin_users_bans_create(
      adminConnection,
      {
        body: {
          userId: memberId,
          reason: "Violation of community guidelines",
        } satisfies ICommunityBbsUserBan.ICreate,
      },
    );
  typia.assert(permanentBan);
  // Ensure that the ban was created as permanent (expires_at should be null)
  TestValidator.equals(
    "initial ban should be permanent",
    permanentBan.expires_at,
    null,
  );
  // Step 5: Update the permanent ban to a temporary ban by setting expires_at to a future date
  const threeDaysFromNow = new Date(
    Date.now() + 3 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const updatedBan = await api.functional.communityBbs.admin.users.bans.update(
    adminConnection,
    {
      body: {
        expiresAt: threeDaysFromNow,
        reason: "Updated reason - temporary ban for violation",
      } satisfies ICommunityBbsUserBan.IUpdate,
    },
  );
  typia.assert(updatedBan);
  // Step 6: Validate the ban was correctly updated
  // - expiration date should be a future date (not null)
  TestValidator.predicate(
    "updated ban should have future expiration date",
    updatedBan.expires_at !== null,
  );
  // - expiration date should be in the future
  const expiresAt = updatedBan.expires_at as string;
  TestValidator.predicate(
    "expires_at should be in future",
    new Date(expiresAt) > new Date(),
  );
  // - the creation timestamp should remain unchanged from original
  TestValidator.equals(
    "update should preserve original creation timestamp",
    updatedBan.created_at,
    permanentBan.created_at,
  );
  // - ban should be active since it has not expired yet
  TestValidator.equals(
    "updated ban should be active",
    updatedBan.is_active,
    true,
  );
  // - the reason should have been updated
  TestValidator.equals(
    "ban reason should be updated",
    updatedBan.reason,
    "Updated reason - temporary ban for violation",
  );
  // - bannedBy should match admin who updated it
  TestValidator.predicate(
    "bannedBy should be admin summary",
    updatedBan.bannedBy.role === "admin",
  );
  // - user information should be preserved
  TestValidator.equals(
    "user ID should remain the same",
    updatedBan.user.id,
    permanentBan.user.id,
  );
  // - the ban ID should match the original ban ID
  TestValidator.equals(
    "updated ban ID should match original",
    updatedBan.id,
    permanentBan.id,
  );
}
