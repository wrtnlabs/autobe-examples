import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
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
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_moderation_roles_create } from "../../../generate/generate_random_community_platform_member_communities_moderation_roles_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_moderation_role } from "../../../prepare/prepare_random_community_platform_moderation_role";

export async function test_api_moderation_role_remove_assignment(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphabets(8)}@test.com`,
      password: `password_${RandomGenerator.alphabets(8)}`,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  const ownerConnection: api.IConnection = { host: connection.host };
  const targetMemberConnection: api.IConnection = { host: connection.host };
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: `owner_${RandomGenerator.alphabets(8)}@test.com`,
      password: `password_${RandomGenerator.alphabets(8)}`,
      username: `owner_${RandomGenerator.alphabets(8)}`,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: `https://example.com/${RandomGenerator.alphabets(6)}.png`,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(owner);
  const targetMember = await authorize_member_join(targetMemberConnection, {
    body: {
      email: `target_${RandomGenerator.alphabets(8)}@test.com`,
      password: `password_${RandomGenerator.alphabets(8)}`,
      username: `target_${RandomGenerator.alphabets(8)}`,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: `https://example.com/${RandomGenerator.alphabets(6)}.png`,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(targetMember);
  const otherMember = await authorize_member_join(otherMemberConnection, {
    body: {
      email: `other_${RandomGenerator.alphabets(8)}@test.com`,
      password: `password_${RandomGenerator.alphabets(8)}`,
      username: `other_${RandomGenerator.alphabets(8)}`,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: `https://example.com/${RandomGenerator.alphabets(6)}.png`,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(otherMember);
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: `community_${RandomGenerator.alphabets(10)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconImageUrl: `https://example.com/${RandomGenerator.alphabets(6)}.png`,
        },
      },
    );
  typia.assert(community);
  const targetRole =
    await generate_random_community_platform_member_communities_moderation_roles_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          communityPlatformMemberId: targetMember.id,
          roleType: "moderator",
        } satisfies ICommunityPlatformModerationRole.ICreate,
      },
    );
  typia.assert(targetRole);
  const otherRole =
    await generate_random_community_platform_member_communities_moderation_roles_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          communityPlatformMemberId: otherMember.id,
          roleType: "moderator",
        } satisfies ICommunityPlatformModerationRole.ICreate,
      },
    );
  typia.assert(otherRole);
  await api.functional.communityPlatform.admin.communities.moderationRoles.erase(
    adminConnection,
    {
      communityId: community.id,
      moderationRoleId: targetRole.id,
    },
  );
  TestValidator.notEquals(
    "removed moderation role must differ from remaining role",
    targetRole.id,
    otherRole.id,
  );
  await api.functional.communityPlatform.admin.communities.moderationRoles.erase(
    adminConnection,
    {
      communityId: community.id,
      moderationRoleId: otherRole.id,
    },
  );
}
