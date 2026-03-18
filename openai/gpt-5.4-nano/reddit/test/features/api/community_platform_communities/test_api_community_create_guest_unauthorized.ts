import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_create_guest_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1) Baseline discovery as guest (no auth)
  const guestConnection: api.IConnection = { host: connection.host };
  const baseline = await api.functional.communityPlatform.communities.index(
    guestConnection,
    {
      body: {},
    },
  );
  typia.assert(baseline);
  const baselineIds = baseline.data.map((x) => x.id);
  // 2) Attempt create as guest (no auth)
  const createBody = {
    name: RandomGenerator.alphabets(12),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    icon_href: `https://example.com/icon/${RandomGenerator.alphabets(8)}.png`,
  } satisfies ICommunityPlatformCommunity.ICreate;
  await TestValidator.httpError(
    "guest cannot create community",
    [401, 403],
    async () => {
      await generate_random_community_platform_communities_create(
        guestConnection,
        {
          body: createBody,
        },
      );
    },
  );
  // 3) Verify discovery list unchanged
  const after = await api.functional.communityPlatform.communities.index(
    guestConnection,
    {
      body: {},
    },
  );
  typia.assert(after);
  const afterIds = after.data.map((x) => x.id);
  TestValidator.equals("community ids unchanged", afterIds, baselineIds);
}
