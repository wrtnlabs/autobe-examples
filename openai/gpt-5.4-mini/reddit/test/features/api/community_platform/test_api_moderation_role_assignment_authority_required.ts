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

export async function test_api_moderation_role_assignment_authority_required(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      username: RandomGenerator.alphabets(8),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: null,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(owner);
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(12),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconImageUrl: `https://example.com/${RandomGenerator.alphabets(8)}.png`,
        },
      },
    );
  typia.assert(community);
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      username: RandomGenerator.alphabets(9),
      displayName: RandomGenerator.name(),
      bio: null,
      avatarImageUri: null,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  await TestValidator.error(
    "regular member cannot assign moderation roles in a community they do not control",
    async () => {
      await generate_random_community_platform_member_communities_moderation_roles_create(
        memberConnection,
        {
          params: { communityId: community.id },
          body: {
            communityPlatformMemberId: owner.id,
            roleType: "moderator",
          } satisfies ICommunityPlatformModerationRole.ICreate,
        },
      );
    },
  );
  TestValidator.notEquals(
    "owner and target member are different accounts",
    owner.id,
    member.id,
  );
}
