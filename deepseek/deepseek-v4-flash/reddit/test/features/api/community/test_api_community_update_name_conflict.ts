import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";

export async function test_api_community_update_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member A
  const connectionA: api.IConnection = { host: connection.host };
  await authorize_member_join(connectionA, {});
  // 2. Create community A with a unique name
  const communityAName = `sports-${RandomGenerator.alphabets(8)}`;
  const communityA =
    await generate_random_community_platform_member_communities_create(
      connectionA,
      {
        body: {
          name: communityAName,
        },
      },
    );
  typia.assert(communityA);
  // 3. Register member B
  const connectionB: api.IConnection = { host: connection.host };
  await authorize_member_join(connectionB, {});
  // 4. Create community B with a different unique name
  const communityBName = `music-${RandomGenerator.alphabets(8)}`;
  const communityB =
    await generate_random_community_platform_member_communities_create(
      connectionB,
      {
        body: {
          name: communityBName,
        },
      },
    );
  typia.assert(communityB);
  // 5. Attempt to update community B's name to community A's name
  // This should fail with 409 Conflict because the name is already taken
  await TestValidator.httpError(
    "should reject updating to an already taken community name",
    409,
    async () => {
      await api.functional.communityPlatform.member.communities.update(
        connectionB,
        {
          communityId: communityB.id,
          body: {
            name: communityAName,
          } satisfies ICommunityPlatformCommunity.IUpdate,
        },
      );
    },
  );
}
