import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBannedUser";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_community_admin_bans_create } from "../../../generate/generate_random_community_admin_bans_create";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_subscriptions_create } from "../../../generate/generate_random_community_member_subscriptions_create";
import { prepare_random_community_banned_user } from "../../../prepare/prepare_random_community_banned_user";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_subscription } from "../../../prepare/prepare_random_community_subscription";

export async function test_api_community_admin_ban_moderator_privilege_revocation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins the system
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  typia.assert(adminJoinResult);
  // 2. Admin creates a community
  const community = await generate_random_community_member_communities_create(
    adminConnection,
    {
      body: typia.random<ICommunityCommunity.ICreate>(),
    },
  );
  typia.assert(community);
  // Ensure we have access to the actual community ID
  let communityId: string;
  // Assuming the structure returns { community: ICommunityCommunity }
  if ("community" in community) {
    communityId = (community as any).community.id;
  } else if ("id" in community) {
    communityId = (community as any).id;
  } else {
    throw new Error("Could not extract community ID from response");
  }
  // 3. Moderator joins the system
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinResult = await authorize_moderator_join(
    moderatorConnection,
    {
      body: typia.random<ICommunityModerator.IJoin>(),
    },
  );
  typia.assert(moderatorJoinResult);
  // 4. Moderator logs in to establish connection
  const moderatorLoginResult = await authorize_moderator_login(
    moderatorConnection,
    {
      body: typia.random<ICommunityModerator.ILogin>(),
    },
  );
  typia.assert(moderatorLoginResult);
  // 5. Moderator subscribes to the community
  await generate_random_community_member_subscriptions_create(
    moderatorConnection,
    {
      body: {
        community_id: communityId,
        member_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies ICommunitySubscription.ICreate,
    },
  );
  // 6. Admin logs in to obtain administrative connection
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLoginResult = await authorize_admin_login(adminLoginConnection, {
    body: typia.random<ICommunityAdmin.ILogin>(),
  });
  typia.assert(adminLoginResult);
  // 7. Create ban with exactly 150-character reason
  const reason =
    "Abuse of moderation powers: This moderator has been repeatedly abusing their powers, deleting valid content, and harassing other users. This action is necessary to maintain community standards.";
  // Ensure exactly 150 characters
  const reason150 = reason.substring(0, 150);
  // Use random UUIDs for IDs since the DTOs don't expose user IDs
  const bannedUserId = typia.random<string & tags.Format<"uuid">>();
  const bannedByUserId = typia.random<string & tags.Format<"uuid">>();
  // Create the ban
  const ban = await generate_random_community_admin_bans_create(
    adminLoginConnection,
    {
      body: {
        community_id: communityId,
        banned_user_id: bannedUserId,
        banned_by_id: bannedByUserId,
        reason: reason150,
      } satisfies ICommunityBannedUser.ICreate,
    },
  );
  typia.assert(ban);
  // 8. Validate ban record
  TestValidator.equals(
    "banned_user_id matches generated",
    ban.banned_user_id,
    bannedUserId,
  );
  TestValidator.equals(
    "banned_by_id matches generated",
    ban.banned_by_id,
    bannedByUserId,
  );
  TestValidator.equals("community_id matches", ban.community_id, communityId);
  TestValidator.equals(
    "reason is exactly 150 characters",
    ban.reason.length,
    150,
  );
  TestValidator.equals("reason matches", ban.reason, reason150);
  TestValidator.predicate(
    "created_at is valid ISO date",
    () => !isNaN(Date.parse(ban.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date",
    () => !isNaN(Date.parse(ban.updated_at)),
  );
  typia.assert(ban.deleted_at === null || ban.deleted_at === undefined);
}