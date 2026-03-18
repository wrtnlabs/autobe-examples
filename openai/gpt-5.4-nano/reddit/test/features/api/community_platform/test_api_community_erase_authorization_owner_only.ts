import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_erase_authorization_owner_only(
  connection: api.IConnection,
): Promise<void> {
  // 1) User A join + authorize
  const userAConnection: api.IConnection = { host: connection.host };
  const userA = await authorize_member_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(userA);
  // 2) User A creates community (owner)
  const community = await generate_random_community_platform_communities_create(
    userAConnection,
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
  const communityId = community.id;
  // 3) User B join + authorize (not owner)
  const userBConnection: api.IConnection = { host: connection.host };
  const userB = await authorize_member_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(userB);
  // 4) User B attempts erase; must be rejected
  await TestValidator.error(
    "non-owner should not erase community",
    async () => {
      await api.functional.communityPlatform.communities.erase(
        userBConnection,
        {
          communityId,
        },
      );
    },
  );
  // 5) Ensure community was not erased by verifying owner erase still succeeds
  await api.functional.communityPlatform.communities.erase(userAConnection, {
    communityId,
  });
  // 6) After erase, ensure it is no longer deletable (second erase should fail)
  await TestValidator.error(
    "erased community should be unavailable for subsequent erase",
    async () => {
      await api.functional.communityPlatform.communities.erase(
        userAConnection,
        {
          communityId,
        },
      );
    },
  );
}
