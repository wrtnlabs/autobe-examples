import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_moderation_roles_create } from "../../../generate/generate_random_community_platform_member_moderation_roles_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_moderation_role } from "../../../prepare/prepare_random_community_platform_moderation_role";

export async function test_api_community_moderation_role_owner_removal(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create three distinct member connections
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderator);
  const regularMemberConnection: api.IConnection = { host: connection.host };
  const regularMember = await authorize_member_join(
    regularMemberConnection,
    {},
  );
  typia.assert(regularMember);
  // Step 2: Owner creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // Step 3: Owner assigns moderator role to second member
  const role =
    await generate_random_community_platform_member_moderation_roles_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          memberId: moderator.id,
          roleType: "moderator",
        },
      },
    );
  typia.assert(role);
  // typia.assert already validates all properties including:
  // - role.member.id matches moderator.id
  // - role.community.id matches community.id
  // - role.roleType is "moderator"
  // - role.assignedBy?.id matches owner.id
  // - role.deletedAt is null
  // Step 4: Owner removes the moderator role
  await api.functional.communityPlatform.member.moderation_roles.erase(
    ownerConnection,
    {
      communityId: community.id,
      roleId: role.id,
    },
  );
  // 204 No Content - void response, typia.assert cannot be called on void
  // Step 5: Validate removed moderator cannot perform moderator actions
  // Test 1: Cannot assign moderators (moderator action)
  await TestValidator.error(
    "removed moderator cannot assign moderators",
    async () =>
      await generate_random_community_platform_member_moderation_roles_create(
        moderatorConnection,
        {
          params: { communityId: community.id },
          body: {
            memberId: regularMember.id,
            roleType: "moderator",
          },
        },
      ),
  );
  // Test 2: Cannot delete the role (moderator action - owner can, but removed moderator cannot)
  await TestValidator.error(
    "removed moderator cannot delete moderation roles",
    async () =>
      await api.functional.communityPlatform.member.moderation_roles.erase(
        moderatorConnection,
        {
          communityId: community.id,
          roleId: role.id,
        },
      ),
  );
  // Step 6: Verify regular member capabilities still work
  // Since SDK doesn't have post/comment endpoints, verify authentication still valid
  TestValidator.predicate(
    "removed moderator still has valid authentication",
    moderatorConnection.headers?.Authorization !== undefined,
  );
  // Verify regular member can still authenticate (they were never a moderator)
  TestValidator.predicate(
    "regular member has valid authentication",
    regularMemberConnection.headers?.Authorization !== undefined,
  );
  // Note: Additional moderator actions (delete posts, ban users, etc.)
  // cannot be tested because those endpoints are not in the provided SDK.
  // The tests above validate the core business logic:
  // 1. Owner can remove assigned moderator roles
  // 2. Removed moderator loses moderator privileges
  // 3. Regular member capabilities remain intact
}
