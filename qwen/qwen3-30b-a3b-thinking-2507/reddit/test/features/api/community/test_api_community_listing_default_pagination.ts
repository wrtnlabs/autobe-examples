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

export async function test_api_community_listing_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  const output = await api.functional.community.communities.index(connection, {
    body: {},
  });
  typia.assert(output);
  TestValidator.equals(
    "pagination current should be 1",
    output.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    output.pagination.limit,
    10,
  );
  TestValidator.predicate("data array length <= 10", output.data.length <= 10);
}
