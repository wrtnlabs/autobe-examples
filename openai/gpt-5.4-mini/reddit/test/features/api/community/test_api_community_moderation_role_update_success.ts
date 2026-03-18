import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
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
import { generate_random_community_platform_member_communities_moderation_roles_create } from "../../../generate/generate_random_community_platform_member_communities_moderation_roles_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_moderation_role } from "../../../prepare/prepare_random_community_platform_moderation_role";

export async function test_api_community_moderation_role_update_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: `member_${RandomGenerator.alphabets(8)}`,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: `community_${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconImageUrl: typia.random<string & tags.Format<"url">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const createdRole =
    await generate_random_community_platform_member_communities_moderation_roles_create(
      memberConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          communityPlatformMemberId: member.id,
          roleType: RandomGenerator.alphabets(8),
        } satisfies ICommunityPlatformModerationRole.ICreate,
      },
    );
  typia.assert(createdRole);
  const createdAt = createdRole.created_at;
  const previousUpdatedAt = createdRole.updated_at;
  const nextRoleType = `${createdRole.role_type}_updated`;
  const updatedRole =
    await api.functional.communityPlatform.member.communities.moderationRoles.update(
      memberConnection,
      {
        communityId: community.id,
        moderationRoleId: createdRole.id,
        body: {
          role_type: nextRoleType,
        } satisfies ICommunityPlatformModerationRole.IUpdate,
      },
    );
  typia.assert(updatedRole);
  TestValidator.equals(
    "moderation role id should remain the same",
    updatedRole.id,
    createdRole.id,
  );
  TestValidator.equals(
    "role type should update",
    updatedRole.role_type,
    nextRoleType,
  );
  TestValidator.equals(
    "created_at should remain stable",
    updatedRole.created_at,
    createdAt,
  );
  TestValidator.notEquals(
    "updated_at should change after update",
    updatedRole.updated_at,
    previousUpdatedAt,
  );
  TestValidator.equals(
    "deleted_at should remain stable",
    updatedRole.deleted_at,
    createdRole.deleted_at,
  );
}
