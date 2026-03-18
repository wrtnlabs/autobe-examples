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

export async function test_api_moderation_role_assignment_duplicate_role(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const targetConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {
    body: {
      email: `owner_${RandomGenerator.alphabets(10)}@example.com` as string &
        tags.Format<"email">,
      password: `Owner_${RandomGenerator.alphaNumeric(12)}!` as string &
        tags.Format<"password">,
      username: `owner_${RandomGenerator.alphabets(10)}`,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: "https://example.com/avatar-owner.png",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const target = await authorize_member_join(targetConnection, {
    body: {
      email: `target_${RandomGenerator.alphabets(10)}@example.com` as string &
        tags.Format<"email">,
      password: `Target_${RandomGenerator.alphaNumeric(12)}!` as string &
        tags.Format<"password">,
      username: `target_${RandomGenerator.alphabets(10)}`,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: "https://example.com/avatar-target.png",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(target);
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: `community_${RandomGenerator.alphabets(10)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconImageUrl: "https://example.com/community-icon.png",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const body = {
    communityPlatformMemberId: target.id,
    roleType: "moderator",
  } satisfies ICommunityPlatformModerationRole.ICreate;
  const firstRole =
    await generate_random_community_platform_member_communities_moderation_roles_create(
      ownerConnection,
      {
        params: {
          communityId: community.id,
        },
        body,
      },
    );
  typia.assert(firstRole);
  TestValidator.equals(
    "community id should match",
    firstRole.community.id,
    community.id,
  );
  TestValidator.equals(
    "role type should match",
    firstRole.role_type,
    body.roleType,
  );
  await TestValidator.httpError(
    "duplicate moderation role assignment should be rejected as conflict",
    409,
    async () => {
      await generate_random_community_platform_member_communities_moderation_roles_create(
        ownerConnection,
        {
          params: {
            communityId: community.id,
          },
          body,
        },
      );
    },
  );
}
