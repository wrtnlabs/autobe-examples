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

export async function test_api_community_moderation_role_hierarchy_protection(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphabets(10)}@example.com`,
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(12),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: null,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(joined);
  const communityConnection: api.IConnection = { host: connection.host };
  communityConnection.headers = {
    Authorization: joined.token.access,
  };
  const community =
    await generate_random_community_platform_member_communities_create(
      communityConnection,
      {
        body: {
          name: `community_${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconImageUrl: "https://example.com/icon.png",
        },
      },
    );
  typia.assert(community);
  const moderationRole =
    await generate_random_community_platform_member_communities_moderation_roles_create(
      communityConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          communityPlatformMemberId: joined.id,
          roleType: "owner",
        } satisfies ICommunityPlatformModerationRole.ICreate,
      },
    );
  typia.assert(moderationRole);
  const snapshot = typia.assert(
    JSON.parse(
      JSON.stringify(moderationRole),
    ) as ICommunityPlatformModerationRole,
  );
  await TestValidator.error(
    "owner moderation role hierarchy protection",
    async () => {
      await api.functional.communityPlatform.member.communities.moderationRoles.update(
        communityConnection,
        {
          communityId: community.id,
          moderationRoleId: moderationRole.id,
          body: {
            role_type: "moderator",
          } satisfies ICommunityPlatformModerationRole.IUpdate,
        },
      );
    },
  );
  TestValidator.equals(
    "moderation role remains unchanged",
    moderationRole,
    snapshot,
  );
}
