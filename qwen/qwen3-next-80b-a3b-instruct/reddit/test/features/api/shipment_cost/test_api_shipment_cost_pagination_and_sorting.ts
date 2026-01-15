import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformShipmentCost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentCost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformShipmentCost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformShipmentCost";
export async function test_api_shipment_cost_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random shipmentId for testing
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: default parameters (should return data)
  const defaultResponse =
    await api.functional.communityPlatform.shipments.costs.index(connection, {
      shipmentId,
      body: {},
    });
  typia.assert(defaultResponse);
  TestValidator.equals(
    "default limit should be 20",
    defaultResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "default page should be 1",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "default response should have at least one record",
    defaultResponse.data.length > 0,
  );
  // Test 2: pagination with limit=5
  const limit5Response =
    await api.functional.communityPlatform.shipments.costs.index(connection, {
      shipmentId,
      body: { limit: 5 },
    });
  typia.assert(limit5Response);
  TestValidator.equals(
    "limit=5 should return up to 5 records",
    limit5Response.data.length <= 5,
    true,
  );
  TestValidator.equals(
    "limit=5 should set pagination limit to 5",
    limit5Response.pagination.limit,
    5,
  );
  // Test 3: page=2 with limit=5
  const page2Limit5Response =
    await api.functional.communityPlatform.shipments.costs.index(connection, {
      shipmentId,
      body: { page: 2, limit: 5 },
    });
  typia.assert(page2Limit5Response);
  TestValidator.equals(
    "page=2,limit=5 should return up to 5 records",
    page2Limit5Response.data.length <= 5,
    true,
  );
  TestValidator.equals(
    "page=2 should show current page as 2",
    page2Limit5Response.pagination.current,
    2,
  );
  // Test 4: sorting by amount ascending
  const sortAmountAscResponse =
    await api.functional.communityPlatform.shipments.costs.index(connection, {
      shipmentId,
      body: { sort_by: "amount", sort_order: "asc" },
    });
  typia.assert(sortAmountAscResponse);
  // Extract the amount values for analysis
  const amounts = sortAmountAscResponse.data.map((record) => record.amount);
  TestValidator.predicate(
    "amounts are sorted ascending",
    amounts.every((amount, i) => i === 0 || amount >= amounts[i - 1]),
  );
  // Test 5: sorting by amount descending (default? In description says created_at is default)
  const sortAmountDescResponse =
    await api.functional.communityPlatform.shipments.costs.index(connection, {
      shipmentId,
      body: { sort_by: "amount", sort_order: "desc" },
    });
  typia.assert(sortAmountDescResponse);
  const amountsDesc = sortAmountDescResponse.data.map(
    (record) => record.amount,
  );
  TestValidator.predicate(
    "amounts are sorted descending",
    amountsDesc.every((amount, i) => i === 0 || amount <= amountsDesc[i - 1]),
  );
  // Test 6: sorting by type ascending
  const sortTypeAscResponse =
    await api.functional.communityPlatform.shipments.costs.index(connection, {
      shipmentId,
      body: { sort_by: "type", sort_order: "asc" },
    });
  typia.assert(sortTypeAscResponse);
  const types = sortTypeAscResponse.data.map((record) => record.cost_type);
  TestValidator.predicate(
    "types are sorted ascending",
    types.every((type, i) => i === 0 || type.localeCompare(types[i - 1]) >= 0),
  );
  // Test 7: sorting by created_at descending (default)
  const sortCreatedAtDescResponse =
    await api.functional.communityPlatform.shipments.costs.index(connection, {
      shipmentId,
      body: { sort_by: "created_at" },
    });
  typia.assert(sortCreatedAtDescResponse);
  const createdAats = sortCreatedAtDescResponse.data.map((record) =>
    new Date(record.created_at).getTime(),
  );
  TestValidator.predicate(
    "created_at are sorted descending",
    createdAats.every((date, i) => i === 0 || date >= createdAats[i - 1]),
  );
  // Test 8: out-of-bounds page
  const totalRecords = sortCreatedAtDescResponse.pagination.records;
  const totalPages = sortCreatedAtDescResponse.pagination.pages;
  // Request page beyond total
  const overLimitPage = totalPages + 1;
  const overLimitResponse =
    await api.functional.communityPlatform.shipments.costs.index(connection, {
      shipmentId,
      body: { page: overLimitPage, limit: 5 },
    });
  typia.assert(overLimitResponse);
  TestValidator.equals(
    "over limit page should return empty array",
    overLimitResponse.data.length,
    0,
  );
  TestValidator.equals(
    "over limit page should have correct current page",
    overLimitResponse.pagination.current,
    overLimitPage,
  );
  TestValidator.equals(
    "over limit page should have correct total records",
    overLimitResponse.pagination.records,
    totalRecords,
  );
  TestValidator.equals(
    "over limit page should have correct total pages",
    overLimitResponse.pagination.pages,
    totalPages,
  );
  // Test 9: first page
  const firstPageResponse =
    await api.functional.communityPlatform.shipments.costs.index(connection, {
      shipmentId,
      body: { page: 1, limit: 5 },
    });
  typia.assert(firstPageResponse);
  TestValidator.equals(
    "first page should return current page 1",
    firstPageResponse.pagination.current,
    1,
  );
  // Test 10: last page
  const lastPageResponse =
    await api.functional.communityPlatform.shipments.costs.index(connection, {
      shipmentId,
      body: { page: totalPages, limit: 5 },
    });
  typia.assert(lastPageResponse);
  TestValidator.equals(
    "last page should return correct current page",
    lastPageResponse.pagination.current,
    totalPages,
  );
  // Test 11: amount filtering
  // We need to find real min and max amounts from the data
  const allData = await api.functional.communityPlatform.shipments.costs.index(
    connection,
    {
      shipmentId,
      body: { page: 1, limit: 100 }, // max limit
    },
  );
  typia.assert(allData);
  if (allData.data.length > 0) {
    const allAmounts = allData.data.map((r) => r.amount);
    const minAmount = Math.min(...allAmounts);
    const maxAmount = Math.max(...allAmounts);
    // Test with amount_min = minAmount and amount_max = maxAmount
    const filteredResponse =
      await api.functional.communityPlatform.shipments.costs.index(connection, {
        shipmentId,
        body: {
          amount_min: minAmount,
          amount_max: maxAmount,
        },
      });
    typia.assert(filteredResponse);
    TestValidator.equals(
      "filtered response should return same number of records",
      filteredResponse.data.length,
      allData.data.length,
    );
    // Test with a narrow range
    const medianAmount = allAmounts[Math.floor(allAmounts.length / 2)];
    const narrowMin = medianAmount;
    const narrowMax = medianAmount + 5;
    const narrowFilteredResponse =
      await api.functional.communityPlatform.shipments.costs.index(connection, {
        shipmentId,
        body: {
          amount_min: narrowMin,
          amount_max: narrowMax,
        },
      });
    typia.assert(narrowFilteredResponse);
    const narrowAmounts = narrowFilteredResponse.data.map((r) => r.amount);
    TestValidator.predicate(
      "narrow filtered amounts are within range",
      narrowAmounts.every((a) => a >= narrowMin && a <= narrowMax),
    );
  }
}
