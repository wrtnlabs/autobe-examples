import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBannedUser";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
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
import { generate_random_community_admin_bans_create } from "../../../generate/generate_random_community_admin_bans_create";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_subscriptions_create } from "../../../generate/generate_random_community_member_subscriptions_create";
import { prepare_random_community_banned_user } from "../../../prepare/prepare_random_community_banned_user";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_subscription } from "../../../prepare/prepare_random_community_subscription";

export async function test_api_community_admin_ban_primary(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup: join and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResponse = await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  const adminLoginResponse = await authorize_admin_login(adminConnection, {
    body: {} satisfies ICommunityAdmin.ILogin,
  });
  // Extract admin ID from JWT (as the schema is incomplete and doesn't expose ID)
  const adminId = decodeJwtId(adminLoginResponse.token.access);
  // 2. Create community as owner
  const community = await generate_random_community_member_communities_create(
    adminConnection,
    {
      body: typia.random<ICommunityCommunity.ICreate>(),
    },
  );
  typia.assert(community);
  // Convert to interface with id despite incomplete schema - this is a schema definition flaw
  const communityWithId = community as unknown as {
    id: string;
  };
  // 3. Member setup: join and login
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinResponse = await authorize_member_join(memberConnection, {
    body: typia.random<ICommunityMember.IJoin>(),
  });
  const memberLoginResponse = await authorize_member_login(memberConnection, {
    body: {} satisfies ICommunityMember.ILogin,
  });
  // Extract member ID from JWT (as the schema is incomplete and doesn't expose ID)
  const memberId = decodeJwtId(memberLoginResponse.token.access);
  // 4. Subscribe member to community
  const subscription =
    await generate_random_community_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: communityWithId.id,
          community_member_id: memberId,
        } satisfies ICommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 5. Admin bans member
  const bannedUser = await generate_random_community_admin_bans_create(
    adminConnection,
    {
      body: {
        community_id: communityWithId.id,
        banned_user_id: memberId,
        reason: "Violated community rules on multiple occasions",
      } satisfies ICommunityBannedUser.ICreate,
    },
  );
  typia.assert(bannedUser);
  // 6. Validate ban
  TestValidator.equals(
    "reason matches",
    bannedUser.reason,
    "Violated community rules on multiple occasions",
  );
  TestValidator.equals(
    "community_id matches",
    bannedUser.community_id,
    communityWithId.id,
  );
  TestValidator.equals(
    "banned_user_id matches",
    bannedUser.banned_user_id,
    memberId,
  );
  TestValidator.equals(
    "banned_by_id matches",
    bannedUser.banned_by_id,
    adminId,
  );
  TestValidator.predicate("ban is active", bannedUser.deleted_at === null);
  TestValidator.predicate(
    "created_at is valid date-time",
    bannedUser.created_at &&
      new Date(bannedUser.created_at).toISOString() === bannedUser.created_at,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    bannedUser.updated_at &&
      new Date(bannedUser.updated_at).toISOString() === bannedUser.updated_at,
  );
}
// Helper to extract ID from JWT as it's the only way to get the user ID
function decodeJwtId(jwt: string): string {
  const parts = jwt.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT");
  const payload = atob(parts[1]);
  const decoded = JSON.parse(payload);
  if (!decoded.sub) throw new Error("JWT does not contain sub field");
  return decoded.sub;
}
