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
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
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
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_ban_removal_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create moderator account and connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(32),
    } satisfies ICommunityBbsModerator.IJoin,
  });
  typia.assert(moderator);
  // Step 2: Create member account and connection (target of ban)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsMember.IJoin,
  });
  typia.assert(member);
  // Step 3: Create admin account for creating the ban
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 4: Create a community for context to establish member identity
  const community =
    await generate_random_community_bbs_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 5: Create a post to establish member identity (as required by scenario)
  const post = await generate_random_community_bbs_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        community_id: community.id,
        post_type: "text",
      } satisfies ICommunityBbsPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 6: Create ban record for member (using admin connection)
  // Must use admin account to create ban (as specified in scenario dependencies)
  const ban = await generate_random_community_bbs_admin_users_bans_create(
    adminConnection,
    {
      body: {
        userId: member.id,
        reason: "Violation of community guidelines",
      } satisfies ICommunityBbsUserBan.ICreate,
    },
  );
  typia.assert(ban);
  // Step 7: Remove the ban using moderator connection (target endpoint)
  // Moderator removes ban using moderator-specific connection.
  // This is the API we're testing: DELETE /communityBbs/moderator/users/bans
  const response = await api.functional.communityBbs.moderator.users.bans.erase(
    moderatorConnection,
    {
      body: {
        banned_user_id: member.id,
      } satisfies ICommunityBbsUserBan.IRequest,
    },
  );
  typia.assert(response);
  // Step 8: Validate that the returned ban record matches the created one
  TestValidator.equals(
    "deleted ban should contain the ban record",
    response.id,
    ban.id,
  );
  TestValidator.equals(
    "deleted ban should have the same reason",
    response.reason,
    ban.reason,
  );
  TestValidator.equals(
    "deleted ban should be marked as inactive",
    response.is_active,
    false,
  );
  // Step 9: The API does not provide a way to list bans after deletion.
  // Since we cannot verify the ban's absence through an API call,
  // we rely on the fact that the erase operation successfully returned the deleted record.
  // This is the final validation point.
}
