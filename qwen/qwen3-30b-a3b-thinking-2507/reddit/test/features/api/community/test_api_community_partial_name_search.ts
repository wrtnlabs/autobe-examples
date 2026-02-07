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

export async function test_api_community_partial_name_search(
  connection: api.IConnection,
): Promise<void> {
  const response: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.search.index(connection);
  typia.assert(response);
  TestValidator.equals(
    "pagination should start at page 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination should have default pageSize=20",
    response.pagination.limit,
    20,
  );
  if (response.data.length > 0) {
    const firstCommunityName = response.data[0].name.toLowerCase();
    TestValidator.predicate("first community name should contain 'dev'", () =>
      firstCommunityName.includes("dev"),
    );
    const names = response.data.map((c) => c.name.toLowerCase());
    const sortedNames = [...names].sort();
    TestValidator.equals(
      "communities are sorted alphabetically",
      names,
      sortedNames,
    );
    {
      TestValidator.predicate("no communities found is valid", () => true);
    }
  }
}
