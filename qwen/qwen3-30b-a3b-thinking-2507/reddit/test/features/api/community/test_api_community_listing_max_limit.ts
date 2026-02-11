import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_listing_max_limit(
  connection: api.IConnection,
) {
  const body = { limit: 100 } satisfies ICommunityCommunity.IRequest;
  const output = await api.functional.community.communities.index(connection, {
    body,
  });
  typia.assert(output);
  TestValidator.equals("pagination limit 100", output.pagination.limit, 100);
  TestValidator.predicate("data length <= 100", output.data.length <= 100);
}
