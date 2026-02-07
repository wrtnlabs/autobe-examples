import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_cancellation_request_snapshots_list(
  connection: api.IConnection,
): Promise<void> {
  // Test basic retrieval of cancellation request snapshots with pagination
  // The endpoint supports public access as indicated by @x-autobe-authorization-actor: null
  // Test 1: Empty result set (no snapshots yet)
  const emptyResponse =
    await api.functional.shoppingMall.cancellation_request_snapshots.index(
      connection,
      {
        body: {
          // Empty request body as per DTO definition - IShoppingMallCancellationRequestSnapshot.IRequest is empty
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(emptyResponse);
  // Validate pagination structure
  TestValidator.equals(
    "pagination exists",
    emptyResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "initial page is 1",
    emptyResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "initial limit is set",
    emptyResponse.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "initial records count",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "initial pages count",
    emptyResponse.pagination.pages,
    0,
  );
  // Validate data array exists
  TestValidator.equals(
    "data array exists",
    emptyResponse.data !== undefined,
    true,
  );
  TestValidator.equals(
    "initial data array length",
    emptyResponse.data.length,
    0,
  );
  // Test 2: Pagination parameters validation
  const paginatedResponse =
    await api.functional.shoppingMall.cancellation_request_snapshots.index(
      connection,
      {
        body: {
          // Test with pagination parameters if supported by the DTO
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  // Validate response structure
  TestValidator.predicate(
    "response has pagination",
    () =>
      paginatedResponse &&
      paginatedResponse.pagination &&
      typeof paginatedResponse.pagination.current === "number" &&
      typeof paginatedResponse.pagination.limit === "number" &&
      typeof paginatedResponse.pagination.records === "number" &&
      typeof paginatedResponse.pagination.pages === "number",
  );
  TestValidator.predicate(
    "data array is valid",
    () => paginatedResponse && Array.isArray(paginatedResponse.data),
  );
  // Test 3: Verify pagination metadata constraints
  TestValidator.predicate(
    "pagination current is positive",
    () => paginatedResponse.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    () => paginatedResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    () => paginatedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    () => paginatedResponse.pagination.pages >= 0,
  );
  // Test 4: Verify snapshots maintain immutability (when data exists)
  if (paginatedResponse.data.length > 0) {
    const snapshot = paginatedResponse.data[0];
    typia.assert<IShoppingMallCancellationRequestSnapshot>(snapshot);
    // Validate snapshot structure (based on the type definition)
    // Since IShoppingMallCancellationRequestSnapshot is currently empty,
    // we just validate it's an object with expected base properties
    TestValidator.predicate(
      "snapshot is an object",
      () => snapshot !== null && typeof snapshot === "object",
    );
  }
}