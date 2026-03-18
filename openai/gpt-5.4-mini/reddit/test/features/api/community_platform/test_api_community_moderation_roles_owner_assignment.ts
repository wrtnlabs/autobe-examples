import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_moderation_roles_owner_assignment(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerJoined = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: RandomGenerator.alphabets(10),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: `https://example.com/avatar-${RandomGenerator.alphabets(8)}.png`,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(ownerJoined);
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: RandomGenerator.alphabets(10),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: `https://example.com/avatar-${RandomGenerator.alphabets(8)}.png`,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberJoined);
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: `community-${RandomGenerator.alphabets(10)}`,
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 3,
            sentenceMax: 5,
          }),
          iconImageUrl: `https://example.com/icon-${RandomGenerator.alphabets(8)}.png`,
        },
      },
    );
  typia.assert(community);
  const response =
    await api.functional.communityPlatform.member.communities.moderationRoles.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          communityPlatformMemberId: memberJoined.id,
          roleType: "moderator",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformModerationRole.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals("moderation role count is one", response.data.length, 1);
  const role = response.data[0];
  TestValidator.equals(
    "community moderation role page is scoped to target community",
    role.community.id,
    community.id,
  );
  TestValidator.equals(
    "assigned member matches target member",
    role.member,
    memberJoined,
  );
  TestValidator.equals(
    "assigned role type is moderator",
    role.role_type,
    "moderator",
  );
  TestValidator.predicate(
    "pagination records is at least one",
    response.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    response.pagination.limit === 20,
  );
  TestValidator.predicate(
    "response includes timestamps",
    role.created_at.length > 0 && role.updated_at.length > 0,
  );
  TestValidator.equals(
    "community name remains unchanged",
    role.community.name,
    community.name,
  );
  TestValidator.equals(
    "community description remains unchanged",
    role.community.description,
    community.description,
  );
  TestValidator.equals(
    "community icon remains unchanged",
    role.community.iconImageUrl,
    community.iconImageUrl,
  );
  TestValidator.equals(
    "community owner remains unchanged",
    role.community.owner,
    community.owner,
  );
}
