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

export async function test_api_community_moderators_remove_owner_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Owner creates a community
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(ownerAuth);
  const community = await generate_random_community_platform_communities_create(
    ownerConnection,
    {
      body: {
        name: typia.random<
          string & tags.MinLength<1> & tags.MaxLength<65535>
        >(),
        description: typia.random<
          string & tags.MinLength<1> & tags.MaxLength<65535>
        >(),
        icon_href: typia.random<
          string & tags.MinLength<1> & tags.MaxLength<80000>
        >(),
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 2) Create a second member to assign as moderator
  const moderatorUserConnection: api.IConnection = { host: connection.host };
  const moderatorUser = await authorize_member_join(moderatorUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(moderatorUser);
  // 3) Assign moderator
  const communityModerator =
    await generate_random_community_platform_community_moderators_create(
      ownerConnection,
      {
        body: {
          communityId: community.id,
          moderatorUserId: moderatorUser.id,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(communityModerator);
  // 4) Remove moderator assignment as community owner
  await api.functional.communityPlatform.communityModerators.erase(
    ownerConnection,
    {
      communityModeratorId: communityModerator.id,
    },
  );
  // 5) Verify removed by asserting second erase fails
  await TestValidator.error(
    "moderator assignment cannot be removed twice",
    async () => {
      await api.functional.communityPlatform.communityModerators.erase(
        ownerConnection,
        {
          communityModeratorId: communityModerator.id,
        },
      );
    },
  );
}
