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
export async function test_api_shipment_cost_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // Generate random shipmentId for testing
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  // Create a connection object
  const testConnection: api.IConnection = { host: connection.host };
  // Since there is no creation API provided, we test the retrieval endpoint with:
  // 1. Empty result for a random non-existent shipment
  // 2. Basic retrieval with filtering and sorting parameters
  // Retrieve costs for a non-existent shipmentId to confirm empty array is returned
  const emptyResponse: IPageICommunityPlatformShipmentCost =
    await api.functional.communityPlatform.shipments.costs.index(
      testConnection,
      {
        shipmentId: shipmentId,
        body: {} satisfies ICommunityPlatformShipmentCost.IRequest,
      },
    );
  typia.assert(emptyResponse);
  // Verify that empty array is returned when no costs exist for non-existent shipment
  TestValidator.equals(
    "empty array for non-existent shipment",
    emptyResponse.data.length,
    0,
  );
  TestValidator.equals(
    "empty pagination for non-existent shipment",
    emptyResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty records count for non-existent shipment",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty pages count for non-existent shipment",
    emptyResponse.pagination.pages,
    0,
  );
  // Retrieve costs for an existing shipment with default parameters
  // Note: We cannot create actual costs since the API lacks a creation endpoint
  // We rely on the API to return empty arrays for non-existent shipments
  // We can validate the retrieval parameters still work with valid structure
  // Retrieve costs with sorting by amount in ascending order
  const sortedResponse: IPageICommunityPlatformShipmentCost =
    await api.functional.communityPlatform.shipments.costs.index(
      testConnection,
      {
        shipmentId: shipmentId,
        body: {
          sort_by: "amount",
          sort_order: "asc",
        } satisfies ICommunityPlatformShipmentCost.IRequest,
      },
    );
  typia.assert(sortedResponse);
  // Validate the structure of the response even without data
  TestValidator.equals(
    "response has pagination",
    sortedResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "response has correct pagination structure",
    sortedResponse.pagination.current >= 1 &&
      sortedResponse.pagination.limit >= 1 &&
      sortedResponse.pagination.records >= 0 &&
      sortedResponse.pagination.pages >= 0,
  );
  // Retrieve costs with filtering by specific cost type
  const filteredResponse: IPageICommunityPlatformShipmentCost =
    await api.functional.communityPlatform.shipments.costs.index(
      testConnection,
      {
        shipmentId: shipmentId,
        body: {
          type: "base_shipping",
        } satisfies ICommunityPlatformShipmentCost.IRequest,
      },
    );
  typia.assert(filteredResponse);
  // Validate the structure of the filtered response
  TestValidator.equals(
    "filtered response has pagination",
    filteredResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "filtered response has data array",
    Array.isArray(filteredResponse.data),
    true,
  );
  // Retrieve costs with amount range filtering
  const amountFilteredResponse: IPageICommunityPlatformShipmentCost =
    await api.functional.communityPlatform.shipments.costs.index(
      testConnection,
      {
        shipmentId: shipmentId,
        body: {
          amount_min: 50,
          amount_max: 200,
        } satisfies ICommunityPlatformShipmentCost.IRequest,
      },
    );
  typia.assert(amountFilteredResponse);
  // Validate the structure of the amount-filtered response
  TestValidator.equals(
    "amount-filtered response has pagination",
    amountFilteredResponse.pagination.current,
    1,
  );
  // Retrieve costs with pagination
  const paginatedResponse: IPageICommunityPlatformShipmentCost =
    await api.functional.communityPlatform.shipments.costs.index(
      testConnection,
      {
        shipmentId: shipmentId,
        body: {
          page: 1,
          limit: 2,
        } satisfies ICommunityPlatformShipmentCost.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  // Verify pagination parameters
  TestValidator.equals(
    "pagination page matches",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches",
    paginatedResponse.pagination.limit,
    2,
  );
  // Verify that the API accepts these parameters without error
  TestValidator.equals(
    "pagination records count is non-negative",
    paginatedResponse.pagination.records >= 0,
    true,
  );
  TestValidator.predicate(
    "pagination pages count",
    paginatedResponse.pagination.pages >= 0,
  );
  // Verify that all expected API parameters can be used without type errors
  // This ensures the endpoint's request body schema is correctly implemented
  // Retrieve a non-existent shipment
  const nonExistentShipmentId = typia.random<string & tags.Format<"uuid">>();
  const emptyShipmentResponse: IPageICommunityPlatformShipmentCost =
    await api.functional.communityPlatform.shipments.costs.index(
      testConnection,
      {
        shipmentId: nonExistentShipmentId,
        body: {} satisfies ICommunityPlatformShipmentCost.IRequest,
      },
    );
  typia.assert(emptyShipmentResponse);
  TestValidator.equals(
    "empty array for non-existent shipment",
    emptyShipmentResponse.data.length,
    0,
  );
  // Since we cannot create test data, we verify that the API response structure is correct
  // by validating types and structure rather than content
  // Validate that the cost response type is correctly implemented
  const sampleResponse: IPageICommunityPlatformShipmentCost =
    await api.functional.communityPlatform.shipments.costs.index(
      testConnection,
      {
        shipmentId: shipmentId,
        body: {} satisfies ICommunityPlatformShipmentCost.IRequest,
      },
    );
  typia.assert(sampleResponse);
  // Verify that the data array contains elements of the correct type
  TestValidator.predicate(
    "data array contains ICommunityPlatformShipmentCost elements",
    sampleResponse.data.every(
      (item) =>
        typeof item.id === "string" &&
        typeof item.shipment_id === "string" &&
        typeof item.cost_type === "string" &&
        typeof item.amount === "number" &&
        typeof item.currency === "string" &&
        typeof item.created_at === "string",
    ),
  );
  // Validate that pagination structure is correctly implemented
  TestValidator.predicate(
    "pagination structure is correct",
    typeof sampleResponse.pagination.current === "number" &&
      typeof sampleResponse.pagination.limit === "number" &&
      typeof sampleResponse.pagination.records === "number" &&
      typeof sampleResponse.pagination.pages === "number" &&
      sampleResponse.pagination.current >= 1 &&
      sampleResponse.pagination.limit >= 1 &&
      sampleResponse.pagination.records >= 0 &&
      sampleResponse.pagination.pages >= 0,
  );
}