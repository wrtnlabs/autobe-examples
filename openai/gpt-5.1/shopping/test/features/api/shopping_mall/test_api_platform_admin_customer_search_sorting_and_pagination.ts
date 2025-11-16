import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_customer_search_sorting_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and authenticate the connection
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuth: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminAuth);

  // 2. Seed multiple customers with deterministic names for later sorting tests
  const customerCount = 8;

  type SeededCustomer = {
    index: number;
    joinBody: IShoppingMallCustomerAuth.IJoin;
    authorized: IShoppingMallCustomer.IAuthorized;
  };

  const seeded: SeededCustomer[] = [];

  for (let i = 0; i < customerCount; ++i) {
    const isVip = i % 2 === 0;
    const baseName = `E2E Customer ${i.toString().padStart(2, "0")}`;
    const name = isVip ? `${baseName} VIP` : baseName;

    const joinBody = {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
      name,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomerAuth.IJoin;

    const authorized: IShoppingMallCustomer.IAuthorized =
      await api.functional.auth.customer.join(connection, {
        body: joinBody,
      });
    typia.assert<IShoppingMallCustomer.IAuthorized>(authorized);

    seeded.push({ index: i, joinBody, authorized });
  }

  // After seeding customers, the connection auth now corresponds to the last
  // customer. Re-authenticate as platform admin so we can call admin endpoints.
  const adminReAuth: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        name: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(12),
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallPlatformAdminJoin.IRequest,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminReAuth);

  // Helper to call the customers index API
  const searchCustomers = async (
    body: IShoppingMallCustomer.IRequest,
  ): Promise<IPageIShoppingMallCustomer.ISummary> => {
    const output =
      await api.functional.shoppingMall.platformAdmin.customers.index(
        connection,
        { body },
      );
    typia.assert<IPageIShoppingMallCustomer.ISummary>(output);
    return output;
  };

  // 3. Test created_at sorting with pagination (page 1 and 2)
  const createdAtPage1 = await searchCustomers({
    page: 1,
    limit: 5,
    orderBy: "created_at",
    orderDirection: "desc",
  });

  const page1Pagination = createdAtPage1.pagination;
  const page1Data = createdAtPage1.data;

  TestValidator.predicate(
    "page1 data length within limit",
    page1Data.length <= page1Pagination.limit,
  );

  // Request second page regardless of records count, to validate non-overlap
  const createdAtPage2 = await searchCustomers({
    page: 2,
    limit: 5,
    orderBy: "created_at",
    orderDirection: "desc",
  });

  const page2Pagination = createdAtPage2.pagination;
  const page2Data = createdAtPage2.data;

  TestValidator.equals(
    "created_at pagination.limit consistent",
    page1Pagination.limit,
    page2Pagination.limit,
  );
  TestValidator.equals(
    "created_at pagination.records consistent",
    page1Pagination.records,
    page2Pagination.records,
  );
  TestValidator.equals(
    "created_at pagination.pages consistent",
    page1Pagination.pages,
    page2Pagination.pages,
  );

  const page1Ids = new Set(page1Data.map((c) => c.id));
  const overlapExists = page2Data.some((c) => page1Ids.has(c.id));
  TestValidator.predicate(
    "no overlap between page1 and page2 customer IDs",
    overlapExists === false,
  );

  // 4. Test name sorting (asc and desc) with a shared prefix for seeded customers
  const seededPrefix = "E2E Customer";

  const nameAsc = await searchCustomers({
    name: seededPrefix,
    orderBy: "name",
    orderDirection: "asc",
    page: 1,
    // large enough to include all seeded customers that match the prefix
    limit: 50,
  });

  const ascData = nameAsc.data;

  // Verify ascending lexical order of display_name
  for (let i = 1; i < ascData.length; ++i) {
    const prev = ascData[i - 1].display_name;
    const curr = ascData[i].display_name;
    TestValidator.predicate(
      `name asc: display_name[${i - 1}] <= display_name[${i}]`,
      prev <= curr,
    );
  }

  const nameDesc = await searchCustomers({
    name: seededPrefix,
    orderBy: "name",
    orderDirection: "desc",
    page: 1,
    limit: 50,
  });

  const descData = nameDesc.data;

  for (let i = 1; i < descData.length; ++i) {
    const prev = descData[i - 1].display_name;
    const curr = descData[i].display_name;
    TestValidator.predicate(
      `name desc: display_name[${i - 1}] >= display_name[${i}]`,
      prev >= curr,
    );
  }

  // Ensure that asc and desc contain the same set of IDs (when both non-empty)
  if (ascData.length > 0 && descData.length > 0) {
    const ascIds = new Set(ascData.map((c) => c.id));
    const descIds = new Set(descData.map((c) => c.id));

    const allAscInDesc = ascData.every((c) => descIds.has(c.id));
    const allDescInAsc = descData.every((c) => ascIds.has(c.id));

    TestValidator.predicate(
      "asc and desc results have same customer ID set",
      allAscInDesc && allDescInAsc,
    );
  }

  // 5. Filter + pagination interaction using VIP subset (name contains "VIP")
  const vipFilter = "VIP";

  const vipPage1 = await searchCustomers({
    name: vipFilter,
    orderBy: "name",
    orderDirection: "asc",
    page: 1,
    limit: 2,
  });

  const vipPage1Pagination = vipPage1.pagination;
  const vipPage1Data = vipPage1.data;

  TestValidator.predicate(
    "vip page1 data length within limit",
    vipPage1Data.length <= vipPage1Pagination.limit,
  );

  const vipRecords = vipPage1Pagination.records;
  const vipPages = vipPage1Pagination.pages;

  if (vipRecords > vipPage1Pagination.limit && vipPages > 1) {
    const vipPage2 = await searchCustomers({
      name: vipFilter,
      orderBy: "name",
      orderDirection: "asc",
      page: 2,
      limit: 2,
    });

    const vipPage2Pagination = vipPage2.pagination;
    const vipPage2Data = vipPage2.data;

    TestValidator.equals(
      "vip pagination.records consistent across pages",
      vipPage1Pagination.records,
      vipPage2Pagination.records,
    );
    TestValidator.equals(
      "vip pagination.pages consistent across pages",
      vipPage1Pagination.pages,
      vipPage2Pagination.pages,
    );

    const vipIds1 = new Set(vipPage1Data.map((c) => c.id));
    const vipOverlap = vipPage2Data.some((c) => vipIds1.has(c.id));
    TestValidator.predicate(
      "vip page1 and page2 have no duplicate IDs",
      vipOverlap === false,
    );
  } else {
    TestValidator.equals(
      "vip single-page records equal data length",
      vipRecords,
      vipPage1Data.length,
    );
  }

  // 6. Out-of-range page handling for VIP filter
  const outOfRangePage = vipPages > 0 ? vipPages + 1 : 2;

  const vipOutOfRange = await searchCustomers({
    name: vipFilter,
    orderBy: "name",
    orderDirection: "asc",
    page: outOfRangePage,
    limit: 2,
  });

  const vipOutPagination = vipOutOfRange.pagination;
  const vipOutData = vipOutOfRange.data;

  TestValidator.equals(
    "out-of-range page returns empty data",
    vipOutData.length,
    0,
  );
  TestValidator.equals(
    "out-of-range preserves records count",
    vipOutPagination.records,
    vipRecords,
  );
  TestValidator.equals(
    "out-of-range preserves pages count",
    vipOutPagination.pages,
    vipPages,
  );
}
