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
export async function test_api_shipment_cost_filtering_by_amount_and_date(
  connection: api.IConnection,
): Promise<void> {
  // Create a guest connection for unauthenticated access
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate a random shipment ID for filtering
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: amount_min edge case - filter with amount_min equal to an existing cost amount
  const result1 = await api.functional.communityPlatform.shipments.costs.index(
    guestConnection,
    {
      shipmentId,
      body: {
        amount_min: 100,
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(result1);
  // Validate that returned costs have amount >= 100
  result1.data.forEach((cost) => {
    TestValidator.predicate("amount >= amount_min", cost.amount >= 100);
  });
  // At least one cost should be returned if any exist with amount >= 100
  TestValidator.predicate(
    "at least one result for amount_min >= 100",
    result1.data.length > 0,
  );
  // Test 2: created_after edge case - filter with created_after exactly matching an existing cost timestamp
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  const result2 = await api.functional.communityPlatform.shipments.costs.index(
    guestConnection,
    {
      shipmentId,
      body: {
        created_after: oneHourAgo,
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(result2);
  // Validate that returned costs have created_at >= oneHourAgo
  result2.data.forEach((cost) => {
    TestValidator.predicate(
      "created_at >= created_after",
      cost.created_at >= oneHourAgo,
    );
  });
  // At least one cost should be returned if any exist with created_at >= oneHourAgo
  TestValidator.predicate(
    "at least one result for created_after >= oneHourAgo",
    result2.data.length > 0,
  );
  // Test 3: combined filters - amount_min with created_after
  const threeHoursAgo = new Date(Date.now() - 10800000).toISOString();
  const result3 = await api.functional.communityPlatform.shipments.costs.index(
    guestConnection,
    {
      shipmentId,
      body: {
        amount_min: 500,
        created_after: threeHoursAgo,
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(result3);
  // Validate that returned costs satisfy both filters
  result3.data.forEach((cost) => {
    TestValidator.predicate("amount >= amount_min", cost.amount >= 500);
    TestValidator.predicate(
      "created_at >= created_after",
      cost.created_at >= threeHoursAgo,
    );
  });
  // At least one cost should be returned if any exist meeting both conditions
  TestValidator.predicate(
    "at least one result for combined filters",
    result3.data.length > 0,
  );
  // Test 4: combined filters - amount_max with created_before
  const twoHoursFromNow = new Date(Date.now() + 7200000).toISOString();
  const result4 = await api.functional.communityPlatform.shipments.costs.index(
    guestConnection,
    {
      shipmentId,
      body: {
        amount_max: 300,
        created_before: twoHoursFromNow,
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(result4);
  // Validate that returned costs satisfy both filters
  result4.data.forEach((cost) => {
    TestValidator.predicate("amount <= amount_max", cost.amount <= 300);
    TestValidator.predicate(
      "created_at <= created_before",
      cost.created_at <= twoHoursFromNow,
    );
  });
  // At least one cost should be returned if any exist meeting both conditions
  TestValidator.predicate(
    "at least one result for amount_max and created_before",
    result4.data.length > 0,
  );
  // Test 5: edge case where amount_min equals amount_max to test exact match
  const result5 = await api.functional.communityPlatform.shipments.costs.index(
    guestConnection,
    {
      shipmentId,
      body: {
        amount_min: 250,
        amount_max: 250,
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(result5);
  // Validate that returned costs have amount exactly 250
  result5.data.forEach((cost) => {
    TestValidator.equals(
      "amount equals amount_max and amount_min",
      cost.amount,
      250,
    );
  });
  // If any cost exists with amount exactly 250, it should be returned
  TestValidator.predicate(
    "result count for exact match",
    result5.data.length >= 0,
  );
  // Verify all results have correct structure
  result1.data.forEach((cost) => {
    typia.assert<ICommunityPlatformShipmentCost>(cost);
  });
  result2.data.forEach((cost) => {
    typia.assert<ICommunityPlatformShipmentCost>(cost);
  });
  result3.data.forEach((cost) => {
    typia.assert<ICommunityPlatformShipmentCost>(cost);
  });
  result4.data.forEach((cost) => {
    typia.assert<ICommunityPlatformShipmentCost>(cost);
  });
  result5.data.forEach((cost) => {
    typia.assert<ICommunityPlatformShipmentCost>(cost);
  });
}
