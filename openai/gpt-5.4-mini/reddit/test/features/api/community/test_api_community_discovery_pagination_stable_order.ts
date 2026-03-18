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

export async function test_api_community_discovery_pagination_stable_order(
  connection: api.IConnection,
): Promise<void> {
  const request: ICommunityPlatformCommunity.IRequest = {
    page: 2,
    limit: 5,
  };
  const limit = request.limit ?? 5;
  const first = await api.functional.communityPlatform.communities.index(
    connection,
    {
      body: request,
    },
  );
  typia.assert(first);
  const second = await api.functional.communityPlatform.communities.index(
    connection,
    {
      body: request,
    },
  );
  typia.assert(second);
  TestValidator.equals(
    "pagination request page",
    first.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit",
    first.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "pagination metadata is stable",
    first.pagination,
    second.pagination,
  );
  TestValidator.equals("page data is stable", first.data, second.data);
  TestValidator.predicate(
    "page size stays within requested limit",
    first.data.length <= limit,
  );
  TestValidator.predicate(
    "pagination reports non-negative totals",
    first.pagination.records >= 0 && first.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page count is consistent with record count when limit is positive",
    first.pagination.limit > 0
      ? first.pagination.pages ===
          Math.ceil(first.pagination.records / first.pagination.limit)
      : true,
  );
  if (first.pagination.records > 0) {
    TestValidator.predicate(
      "requested page is within the available range when data exists",
      first.pagination.current <= first.pagination.pages,
    );
  }
}
