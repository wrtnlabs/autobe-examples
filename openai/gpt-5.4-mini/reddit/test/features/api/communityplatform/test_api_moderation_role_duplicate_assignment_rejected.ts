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
import { generate_random_community_platform_admin_communities_moderation_roles_create } from "../../../generate/generate_random_community_platform_admin_communities_moderation_roles_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_moderation_role } from "../../../prepare/prepare_random_community_platform_moderation_role";

export async function test_api_moderation_role_duplicate_assignment_rejected(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoin = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphabets(12),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberJoin);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(12),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconImageUrl: typia.random<string & tags.Format<"url">>(),
        },
      },
    );
  typia.assert(community);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<1> & tags.Format<"password">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const roleRequest = {
    communityId: community.id,
    body: {
      communityPlatformMemberId: memberJoin.id,
      roleType: "moderator",
    } satisfies ICommunityPlatformModerationRole.ICreate,
  };
  const original =
    await generate_random_community_platform_admin_communities_moderation_roles_create(
      adminConnection,
      {
        params: { communityId: roleRequest.communityId },
        body: roleRequest.body,
      },
    );
  typia.assert(original);
  const originalSnapshot = {
    id: original.id,
    community: original.community,
    member: original.member,
    role_type: original.role_type,
    created_at: original.created_at,
    updated_at: original.updated_at,
    deleted_at: original.deleted_at,
  } satisfies ICommunityPlatformModerationRole;
  await TestValidator.error(
    "duplicate moderation role assignment should be rejected",
    async () => {
      await generate_random_community_platform_admin_communities_moderation_roles_create(
        adminConnection,
        {
          params: { communityId: roleRequest.communityId },
          body: roleRequest.body,
        },
      );
    },
  );
  TestValidator.equals(
    "original moderation role remains unchanged",
    original,
    originalSnapshot,
  );
  TestValidator.equals(
    "original role type remains unchanged",
    original.role_type,
    "moderator",
  );
  TestValidator.equals(
    "original deleted_at remains null",
    original.deleted_at,
    null,
  );
}
