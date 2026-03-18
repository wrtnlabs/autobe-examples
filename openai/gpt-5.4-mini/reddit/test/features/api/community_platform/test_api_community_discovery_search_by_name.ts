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

export async function test_api_community_discovery_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  const searchTerm = `community-${RandomGenerator.alphabets(8)}`;
  const response = await api.functional.communityPlatform.communities.index(
    connection,
    {
      body: {
        search: searchTerm,
        page: 1,
        limit: 100,
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.predicate(
    "pagination current should be first page",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should match request",
    response.pagination.limit === 100,
  );
  TestValidator.predicate(
    "pagination totals should be coherent",
    response.pagination.records >= response.data.length &&
      response.pagination.pages >= 0 &&
      response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "all returned communities should match the search term",
    response.data.every((community) =>
      community.name.toLowerCase().includes(searchTerm.toLowerCase()),
    ),
  );
  TestValidator.predicate(
    "response should contain unique community ids",
    new Set(response.data.map((community) => community.id)).size ===
      response.data.length,
  );
}
