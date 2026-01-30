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
export async function test_api_admin_ban_user_permanent(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
    } satisfies ICommunityBbsAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create member account to be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: memberPassword,
    } satisfies ICommunityBbsMember.IJoin,
  });
  typia.assert(member);
  // Step 3: Login as member to establish account and activity context
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: member.email,
      password: memberPassword,
    } satisfies ICommunityBbsMember.ILogin,
  });
  // Step 4: Create a community context for the member to participate in
  const communityConnection: api.IConnection = { host: connection.host };
  const community =
    await generate_random_community_bbs_member_communities_create(
      communityConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 5: Create a post by the member to establish activity before ban
  const postConnection: api.IConnection = { host: connection.host };
  const post = await generate_random_community_bbs_member_posts_create(
    postConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.name(20), // Replaced sentence with name() for randomized short title
      } satisfies ICommunityBbsPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 6: Admin login for authorization to perform ban
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: admin.email,
      password: adminPassword,
    } satisfies ICommunityBbsAdmin.ILogin,
  });
  // Step 7: Create permanent ban for the member
  const banConnection: api.IConnection = { host: connection.host };
  const banReason = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 10,
  });
  const ban = await generate_random_community_bbs_admin_users_bans_create(
    banConnection,
    {
      body: {
        userId: member.id,
        reason: banReason,
        expiresAt: null,
      } satisfies ICommunityBbsUserBan.ICreate,
    },
  );
  typia.assert(ban);
  // Step 8: Validate ban record structure and properties
  TestValidator.equals("ban user ID matches", ban.user.id, member.id);
  TestValidator.equals("ban reason matches", ban.reason, banReason);
  TestValidator.equals("ban is permanent", ban.expires_at, null);
  TestValidator.equals("ban is active", ban.is_active, true);
  TestValidator.equals("bannedBy is admin", ban.bannedBy.role, "admin");
  // Fixed: Handle nullable date-time with satisfies pattern
  typia.assertGuard<string & tags.Format<"date-time">>(ban.created_at satisfies string | null as string | null);
}