import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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
import { generate_random_community_platform_member_bans_create } from "../../../generate/generate_random_community_platform_member_bans_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_moderation_roles_create } from "../../../generate/generate_random_community_platform_member_moderation_roles_create";
import { prepare_random_community_platform_ban } from "../../../prepare/prepare_random_community_platform_ban";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_moderation_role } from "../../../prepare/prepare_random_community_platform_moderation_role";

export async function test_api_temporary_ban_details_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create member account for community creation
  const memberConnection: api.IConnection = { host: connection.host };
  const communityOwner = await authorize_member_join(memberConnection, {});
  typia.assert(communityOwner);
  // 3. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 4. Create target member to be banned
  const targetMemberConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(targetMemberConnection, {});
  typia.assert(targetMember);
  // 5. Assign moderator role to admin
  const moderationRole =
    await generate_random_community_platform_member_moderation_roles_create(
      memberConnection,
      {
        body: {
          memberId: admin.id,
          roleType: "moderator",
        } satisfies ICommunityPlatformModerationRole.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(moderationRole);
  // 6. Admin creates temporary ban with future expiration
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  const banCreateBody = {
    memberId: targetMember.id,
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    expiresAt: futureDate.toISOString(),
  } satisfies ICommunityPlatformBan.ICreate;
  const createdBan =
    await generate_random_community_platform_member_bans_create(
      adminConnection,
      {
        body: banCreateBody,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(createdBan);
  // 7. Admin retrieves ban details
  const retrievedBan = await api.functional.communityPlatform.admin.bans.at(
    adminConnection,
    {
      communityId: community.id,
      banId: createdBan.id,
    },
  );
  typia.assert(retrievedBan);
  // 8. Validate expires_at field is future date and active status
  TestValidator.equals("ban IDs match", retrievedBan.id, createdBan.id);
  TestValidator.equals(
    "ban reasons match",
    retrievedBan.reason,
    createdBan.reason,
  );
  TestValidator.equals(
    "community IDs match",
    retrievedBan.community.id,
    community.id,
  );
  TestValidator.equals(
    "banned member IDs match",
    retrievedBan.bannedMember.id,
    targetMember.id,
  );
  TestValidator.equals("active status is true", retrievedBan.active, true);
  TestValidator.predicate("expires_at is future date", () => {
    if (retrievedBan.expires_at === null) return false;
    const expiresAt = new Date(retrievedBan.expires_at);
    return expiresAt.getTime() > Date.now();
  });
  TestValidator.predicate("banned_at is valid date", () => {
    const bannedAt = new Date(retrievedBan.banned_at);
    return !isNaN(bannedAt.getTime());
  });
  TestValidator.equals("unbanned_at is null", retrievedBan.unbanned_at, null);
  TestValidator.equals("deleted_at is null", retrievedBan.deleted_at, null);
  TestValidator.equals(
    "issuing moderator role ID matches",
    retrievedBan.issuingModeratorRole.id,
    moderationRole.id,
  );
}
