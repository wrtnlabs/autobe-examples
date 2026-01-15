import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentGatewayFailover } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentGatewayFailover";
import type { IShoppingMallPaymentGatewayFailover } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentGatewayFailover";

export async function test_api_payment_gateway_failover_configuration_lookup(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for unauthenticated operations
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate random test data for various failover configurations
  const gatewayNames = ["stripe", "paypal", "square", "authorize_net"] as const;
  const regions = ["US", "EU", "JP", "CA"] as const;
  // Create multiple failover configurations with varied parameters
  const testConfigs = ArrayUtil.repeat(10, (index) => {
    const randomGateway = RandomGenerator.pick(gatewayNames);
    const randomRegion = RandomGenerator.pick(regions);
    const randomPriority = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >();
    const randomIsActive = RandomGenerator.pick([true, false]);
    return {
      gatewayName: randomGateway,
      region: randomRegion,
      priority: randomPriority,
      isActive: randomIsActive,
    };
  });
  // Validate that each configuration can be retrieved with individual filters
  for (const config of testConfigs) {
    // Test by gatewayName only
    const byGateway =
      await api.functional.shoppingMall.payment_gateway_failovers.index(
        guestConnection,
        {
          body: {
            gatewayName: config.gatewayName,
          } satisfies IShoppingMallPaymentGatewayFailover.IRequest,
        },
      );
    typia.assert(byGateway);
    // Verify results contain only entries with matching gatewayName
    TestValidator.predicate(
      "all results match gatewayName filter",
      byGateway.data.every((item) => typia.assert<(typeof item & { gatewayName: string })>(item).gatewayName === config.gatewayName),
    );
    // Test by region only
    const byRegion =
      await api.functional.shoppingMall.payment_gateway_failovers.index(
        guestConnection,
        {
          body: {
            region: config.region,
          } satisfies IShoppingMallPaymentGatewayFailover.IRequest,
        },
      );
    typia.assert(byRegion);
    // Verify results contain only entries with matching region
    TestValidator.predicate(
      "all results match region filter",
      byRegion.data.every((item) => typia.assert<(typeof item & { region: string })>(item).region === config.region),
    );
    // Test by priority only
    const byPriority =
      await api.functional.shoppingMall.payment_gateway_failovers.index(
        guestConnection,
        {
          body: {
            priority: config.priority,
          } satisfies IShoppingMallPaymentGatewayFailover.IRequest,
        },
      );
    typia.assert(byPriority);
    // Verify results contain only entries with matching priority
    TestValidator.predicate(
      "all results match priority filter",
      byPriority.data.every((item) => typia.assert<(typeof item & { priority: number })>(item).priority === config.priority),
    );
    // Test by isActive status only
    const byIsActive =
      await api.functional.shoppingMall.payment_gateway_failovers.index(
        guestConnection,
        {
          body: {
            isActive: config.isActive,
          } satisfies IShoppingMallPaymentGatewayFailover.IRequest,
        },
      );
    typia.assert(byIsActive);
    // Verify results contain only entries with matching isActive status
    TestValidator.predicate(
      "all results match isActive filter",
      byIsActive.data.every((item) => typia.assert<(typeof item & { isActive: boolean })>(item).isActive === config.isActive),
    );
  }
  // Test combined filters - gatewayName and region
  const combinedFilter = testConfigs[0];
  const combinedResults =
    await api.functional.shoppingMall.payment_gateway_failovers.index(
      guestConnection,
      {
        body: {
          gatewayName: combinedFilter.gatewayName,
          region: combinedFilter.region,
        } satisfies IShoppingMallPaymentGatewayFailover.IRequest,
      },
    );
  typia.assert(combinedResults);
  // Verify results match both filter criteria
  TestValidator.predicate(
    "combined filter results match both criteria",
    combinedResults.data.every(
      (item) =>
        typia.assert<(typeof item & { gatewayName: string })>(item).gatewayName === combinedFilter.gatewayName &&
        typia.assert<(typeof item & { region: string })>(item).region === combinedFilter.region,
    ),
  );
  // Test combined filters - gatewayName and priority
  const priorityFilter = testConfigs[1];
  const priorityResults =
    await api.functional.shoppingMall.payment_gateway_failovers.index(
      guestConnection,
      {
        body: {
          gatewayName: priorityFilter.gatewayName,
          priority: priorityFilter.priority,
        } satisfies IShoppingMallPaymentGatewayFailover.IRequest,
      },
    );
  typia.assert(priorityResults);
  // Verify results match both filter criteria
  TestValidator.predicate(
    "priority combined filter results match both criteria",
    priorityResults.data.every(
      (item) =>
        typia.assert<(typeof item & { gatewayName: string })>(item).gatewayName === priorityFilter.gatewayName &&
        typia.assert<(typeof item & { priority: number })>(item).priority === priorityFilter.priority,
    ),
  );
  // Test combined filters - region and isActive status
  const regionIsActiveFilter = testConfigs[2];
  const regionIsActiveResults =
    await api.functional.shoppingMall.payment_gateway_failovers.index(
      guestConnection,
      {
        body: {
          region: regionIsActiveFilter.region,
          isActive: regionIsActiveFilter.isActive,
        } satisfies IShoppingMallPaymentGatewayFailover.IRequest,
      },
    );
  typia.assert(regionIsActiveResults);
  // Verify results match both filter criteria
  TestValidator.predicate(
    "region and isActive combined filter results match both criteria",
    regionIsActiveResults.data.every(
      (item) =>
        typia.assert<(typeof item & { region: string })>(item).region === regionIsActiveFilter.region &&
        typia.assert<(typeof item & { isActive: boolean })>(item).isActive === regionIsActiveFilter.isActive,
    ),
  );
  // Test all four filters combined
  const allFilters = testConfigs[3];
  const allFiltersResults =
    await api.functional.shoppingMall.payment_gateway_failovers.index(
      guestConnection,
      {
        body: {
          gatewayName: allFilters.gatewayName,
          region: allFilters.region,
          priority: allFilters.priority,
          isActive: allFilters.isActive,
        } satisfies IShoppingMallPaymentGatewayFailover.IRequest,
      },
    );
  typia.assert(allFiltersResults);
  // Verify results match all filter criteria
  TestValidator.predicate(
    "all filters combined results match all criteria",
    allFiltersResults.data.every(
      (item) =>
        typia.assert<(typeof item & { gatewayName: string })>(item).gatewayName === allFilters.gatewayName &&
        typia.assert<(typeof item & { region: string })>(item).region === allFilters.region &&
        typia.assert<(typeof item & { priority: number })>(item).priority === allFilters.priority &&
        typia.assert<(typeof item & { isActive: boolean })>(item).isActive === allFilters.isActive,
    ),
  );
  // Validate response structure - every result contains required fields
  TestValidator.predicate(
    "all results contain required fields: gatewayName, region, priority, isActive",
    allFiltersResults.data.every(
      (item) =>
        typia.assert<(typeof item & { gatewayName: string })>(item).gatewayName !== undefined &&
        typia.assert<(typeof item & { region: string })>(item).region !== undefined &&
        typia.assert<(typeof item & { priority: number })>(item).priority !== undefined &&
        typia.assert<(typeof item & { isActive: boolean })>(item).isActive !== undefined,
    ),
  );
  // Validate that data elements represent the expected structure
  TestValidator.predicate(
    "gatewayName has valid format (non-empty string)",
    allFiltersResults.data.every(
      (item) =>
        typeof typia.assert<(typeof item & { gatewayName: string })>(item).gatewayName === "string" &&
        typia.assert<(typeof item & { gatewayName: string })>(item).gatewayName.length > 0,
    ),
  );
  TestValidator.predicate(
    "region has valid format (ISO 3166-1 alpha-2 code)",
    allFiltersResults.data.every(
      (item) =>
        typeof typia.assert<(typeof item & { region: string })>(item).region === "string" &&
        /^[A-Z]{2}$/.test(typia.assert<(typeof item & { region: string })>(item).region),
    ),
  );
  TestValidator.predicate(
    "priority is a valid integer between 1-100",
    allFiltersResults.data.every(
      (item) =>
        typeof typia.assert<(typeof item & { priority: number })>(item).priority === "number" &&
        Number.isInteger(typia.assert<(typeof item & { priority: number })>(item).priority) &&
        typia.assert<(typeof item & { priority: number })>(item).priority >= 1 &&
        typia.assert<(typeof item & { priority: number })>(item).priority <= 100,
    ),
  );
  TestValidator.predicate(
    "isActive is a boolean",
    allFiltersResults.data.every((item) => typeof typia.assert<(typeof item & { isActive: boolean })>(item).isActive === "boolean"),
  );
  // Validate pagination structure
  TestValidator.equals(
    "pagination contains correct current page",
    allFiltersResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination contains correct limit",
    allFiltersResults.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination contains correct records count",
    allFiltersResults.pagination.records,
    allFiltersResults.data.length,
  );
  TestValidator.equals(
    "pagination contains correct number of pages",
    allFiltersResults.pagination.pages,
    Math.ceil(
      allFiltersResults.data.length / allFiltersResults.pagination.limit,
    ),
  );
}