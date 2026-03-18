import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_moderators_create } from "../../../generate/generate_random_community_platform_community_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

export async function test_api_community_moderators_remove_idempotent_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1) Community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(ownerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(ownerAuth);
  const community: ICommunityPlatformCommunity =
    await generate_random_community_platform_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href: `https://example.com/icon/${typia.random<string & tags.Format<"uuid">>()}`,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 2) Second member to become moderator
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(memberAuth);
  // 3) First moderator assignment (created by community owner)
  const communityModerator1: ICommunityPlatformCommunityModerator =
    await generate_random_community_platform_community_moderators_create(
      ownerConnection,
      {
        body: {
          communityId: community.id,
          moderatorUserId: memberAuth.id,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(communityModerator1);
  // 4) First delete
  await api.functional.communityPlatform.communityModerators.erase(
    ownerConnection,
    {
      communityModeratorId: communityModerator1.id,
    },
  );
  // 5) Second delete (idempotent / already absent)
  await TestValidator.httpError(
    "second delete should be not-found",
    404,
    async () => {
      await api.functional.communityPlatform.communityModerators.erase(
        ownerConnection,
        {
          communityModeratorId: communityModerator1.id,
        },
      );
    },
  );
  // 6) Create another moderator assignment for same community and member
  const communityModerator2: ICommunityPlatformCommunityModerator =
    await generate_random_community_platform_community_moderators_create(
      ownerConnection,
      {
        body: {
          communityId: community.id,
          moderatorUserId: memberAuth.id,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(communityModerator2);
  // 7) Verify the second assignment still exists
  const fetched: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.communityModerators.at(
      ownerConnection,
      {
        communityModeratorId: communityModerator2.id,
      },
    );
  typia.assert(fetched);
  TestValidator.equals(
    "moderator user id matches",
    fetched.moderator_user_id,
    communityModerator2.moderator_user_id,
  );
}
