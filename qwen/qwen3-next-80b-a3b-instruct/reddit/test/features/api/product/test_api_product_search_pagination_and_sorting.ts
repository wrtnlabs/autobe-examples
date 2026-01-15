import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { ICommunityPlatformProductSpecificationFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductSpecificationFilter";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProduct";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_product_search_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);
  // Step 2: Fetch initial product list to establish baseline
  const baselineResult = await api.functional.communityPlatform.products.index(
    memberConnection,
    {
      body: {
        limit: 10,
      } satisfies ICommunityPlatformProduct.IRequest,
    },
  );
  typia.assert(baselineResult);
  // Validate baseline pagination
  TestValidator.equals(
    "baseline page has 10 items",
    baselineResult.data.length,
    10,
  );
  TestValidator.equals(
    "baseline current page is 1",
    baselineResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "baseline limit is 10",
    baselineResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "baseline records > 0",
    baselineResult.pagination.records > 0,
  );
  TestValidator.predicate(
    "baseline pages >= 1",
    baselineResult.pagination.pages >= 1,
  );
  // Step 3: Test sorting by name ascending
  const sortedByNameAscResult =
    await api.functional.communityPlatform.products.index(memberConnection, {
      body: {
        sort_by: "name",
        order: "asc",
        limit: 10,
      } satisfies ICommunityPlatformProduct.IRequest,
    });
  typia.assert(sortedByNameAscResult);
  // Validate that results are sorted alphabetically by name
  for (let i = 0; i < sortedByNameAscResult.data.length - 1; i++) {
    const current = sortedByNameAscResult.data[i].name;
    const next = sortedByNameAscResult.data[i + 1].name;
    TestValidator.predicate(
      `product ${i} name <= product ${i + 1} name`,
      current.localeCompare(next) <= 0,
    );
  }
  // Step 4: Test sorting by price descending
  const sortedByPriceDescResult =
    await api.functional.communityPlatform.products.index(memberConnection, {
      body: {
        sort_by: "price",
        order: "desc",
        limit: 10,
      } satisfies ICommunityPlatformProduct.IRequest,
    });
  typia.assert(sortedByPriceDescResult);
  // Validate that results are sorted in descending price order
  for (let i = 0; i < sortedByPriceDescResult.data.length - 1; i++) {
    const current = sortedByPriceDescResult.data[i].price;
    const next = sortedByPriceDescResult.data[i + 1].price;
    TestValidator.predicate(
      `product ${i} price >= product ${i + 1} price`,
      current >= next,
    );
  }
  // Step 5: Test pagination with page 2
  const page2Result = await api.functional.communityPlatform.products.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies ICommunityPlatformProduct.IRequest,
    },
  );
  typia.assert(page2Result);
  // Validate page 2 has different products than page 1
  const baselineIds = baselineResult.data.map((p) => p.id);
  const page2Ids = page2Result.data.map((p) => p.id);
  const overlap = baselineIds.filter((id) => page2Ids.includes(id));
  TestValidator.equals(
    "baseline page and page 2 have no overlap",
    overlap.length,
    0,
  );
  // Step 6: Test with non-default limit (5)
  const smallPageResult = await api.functional.communityPlatform.products.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformProduct.IRequest,
    },
  );
  typia.assert(smallPageResult);
  TestValidator.equals(
    "small page has 5 items",
    smallPageResult.data.length,
    5,
  );
  TestValidator.equals(
    "small page current page is 1",
    smallPageResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "small page limit is 5",
    smallPageResult.pagination.limit,
    5,
  );
  // Step 7: Test sorting with missing order (default is ascending)
  const defaultOrderResult =
    await api.functional.communityPlatform.products.index(memberConnection, {
      body: {
        sort_by: "name",
        limit: 10,
      } satisfies ICommunityPlatformProduct.IRequest,
    });
  typia.assert(defaultOrderResult);
  // Validate that default sorting (ascending) matches explicit ascending
  for (let i = 0; i < 5; i++) {
    TestValidator.equals(
      `default order product ${i} equals explicit asc order product ${i}`,
      defaultOrderResult.data[i].name,
      sortedByNameAscResult.data[i].name,
    );
  }
  // Step 8: Test with non-existent sort_by value - we cannot test this without type errors
  // The API may silently ignore it and use default sort, which is acceptable behavior
  // We cannot test this because we're not allowed to use 'as any' and there is no way to safely create an invalid value
  // This test is omitted to comply with zero tolerance for type error testing
}
