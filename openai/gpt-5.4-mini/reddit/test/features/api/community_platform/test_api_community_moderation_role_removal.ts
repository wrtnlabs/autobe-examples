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

export async function test_api_community_moderation_role_removal(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const targetMemberConnection: api.IConnection = { host: connection.host };
  const unrelatedMemberConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(12)}@test.com` satisfies string &
        tags.Format<"email">,
      password: "password123!" satisfies string & tags.Format<"password">,
      username: `owner_${RandomGenerator.alphabets(8)}`,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: "https://example.com/avatar-owner.png" satisfies string &
        tags.Format<"uri">,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(owner);
  const targetMember = await authorize_member_join(targetMemberConnection, {
    body: {
      email: `${RandomGenerator.alphabets(12)}@test.com` satisfies string &
        tags.Format<"email">,
      password: "password123!" satisfies string & tags.Format<"password">,
      username: `target_${RandomGenerator.alphabets(8)}`,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: "https://example.com/avatar-target.png" satisfies string &
        tags.Format<"uri">,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(targetMember);
  const unrelatedMember = await authorize_member_join(
    unrelatedMemberConnection,
    {
      body: {
        email: `${RandomGenerator.alphabets(12)}@test.com` satisfies string &
          tags.Format<"email">,
        password: "password123!" satisfies string & tags.Format<"password">,
        username: `other_${RandomGenerator.alphabets(8)}`,
        displayName: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatarImageUri:
          "https://example.com/avatar-other.png" satisfies string &
            tags.Format<"uri">,
      } satisfies ICommunityPlatformMember.IJoin,
    },
  );
  typia.assert(unrelatedMember);
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: `community_${RandomGenerator.alphabets(10)}`,
          description: RandomGenerator.content({ paragraphs: 1 }),
          iconImageUrl:
            "https://example.com/community-icon.png" satisfies string &
              tags.Format<"url">,
        },
      },
    );
  typia.assert(community);
  const unrelatedCommunity =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: `unrelated_${RandomGenerator.alphabets(10)}`,
          description: RandomGenerator.content({ paragraphs: 1 }),
          iconImageUrl:
            "https://example.com/community-icon-2.png" satisfies string &
              tags.Format<"url">,
        },
      },
    );
  typia.assert(unrelatedCommunity);
  const moderationRole =
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
  typia.assert(moderationRole);
  await api.functional.communityPlatform.member.communities.moderationRoles.erase(
    ownerConnection,
    {
      communityId: community.id,
      moderationRoleId: moderationRole.id,
    },
  );
  await TestValidator.httpError(
    "removing the same moderation role twice should fail",
    [404],
    async () => {
      await api.functional.communityPlatform.member.communities.moderationRoles.erase(
        ownerConnection,
        {
          communityId: community.id,
          moderationRoleId: moderationRole.id,
        },
      );
    },
  );
  await TestValidator.httpError(
    "deleting a moderation role from an unrelated community should fail",
    [404],
    async () => {
      await api.functional.communityPlatform.member.communities.moderationRoles.erase(
        ownerConnection,
        {
          communityId: unrelatedCommunity.id,
          moderationRoleId: moderationRole.id,
        },
      );
    },
  );
}
