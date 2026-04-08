import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_sessions_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Call endpoint with default parameters
  const defaultParams = {} satisfies IMultiUserTodoGuest.IRequest;
  const defaultResponse = await api.functional.multiUserTodo.guests.index(
    connection,
    {
      body: defaultParams,
    },
  );
  typia.assert(defaultResponse);
  // Verify pagination structure
  TestValidator.equals(
    "default page should be 1",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit should be 20",
    defaultResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "records should be non-negative",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be non-negative",
    defaultResponse.pagination.pages >= 0,
  );
  // Verify data is an array
  typia.assert(Array.isArray(defaultResponse.data));
  // 2. Validate each guest session summary structure
  if (defaultResponse.data.length > 0) {
    const firstGuest = defaultResponse.data[0];
    typia.assert(firstGuest);
    // Verify required fields exist
    typia.assert(firstGuest.id);
    typia.assert(firstGuest.fingerprint_hash);
    typia.assert(firstGuest.status);
    typia.assert(firstGuest.created_at);
    typia.assert(firstGuest.updated_at);
    // Verify fingerprint_hash is exactly 8 characters
    TestValidator.equals(
      "fingerprint_hash should be 8 characters",
      firstGuest.fingerprint_hash.length,
      8,
    );
    // Verify status is valid enum value
    TestValidator.predicate(
      "status should be valid enum",
      ["active", "expired", "deleted"].includes(firstGuest.status),
    );
    // Verify dates are valid ISO 8601 format
    const createdDate = new Date(firstGuest.created_at);
    TestValidator.predicate(
      "created_at should be valid date",
      !isNaN(createdDate.getTime()),
    );
    const updatedDate = new Date(firstGuest.updated_at);
    TestValidator.predicate(
      "updated_at should be valid date",
      !isNaN(updatedDate.getTime()),
    );
    // Verify sensitive fields are NOT present in summary response
    TestValidator.predicate(
      "user_agent should not be in summary",
      !("user_agent" in firstGuest),
    );
    TestValidator.predicate(
      "ip_address should not be in summary",
      !("ip_address" in firstGuest),
    );
  }
  // 3. Test pagination with page=2
  const page2Params = {
    page: 2,
    limit: 20,
  } satisfies IMultiUserTodoGuest.IRequest;
  const page2Response = await api.functional.multiUserTodo.guests.index(
    connection,
    {
      body: page2Params,
    },
  );
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 should return page 2",
    page2Response.pagination.current,
    2,
  );
  // 4. Test with custom limit of 10
  const limit10Params = {
    limit: 10,
  } satisfies IMultiUserTodoGuest.IRequest;
  const limit10Response = await api.functional.multiUserTodo.guests.index(
    connection,
    {
      body: limit10Params,
    },
  );
  typia.assert(limit10Response);
  TestValidator.equals(
    "custom limit should be 10",
    limit10Response.pagination.limit,
    10,
  );
  // 5. Test status filter with 'active'
  const activeParams = {
    status: "active",
  } satisfies IMultiUserTodoGuest.IRequest;
  const activeResponse = await api.functional.multiUserTodo.guests.index(
    connection,
    {
      body: activeParams,
    },
  );
  typia.assert(activeResponse);
  TestValidator.equals(
    "active status filter should match data length",
    activeResponse.pagination.records,
    activeResponse.data.length,
  );
  // 6. Test status filter with 'expired'
  const expiredParams = {
    status: "expired",
  } satisfies IMultiUserTodoGuest.IRequest;
  const expiredResponse = await api.functional.multiUserTodo.guests.index(
    connection,
    {
      body: expiredParams,
    },
  );
  typia.assert(expiredResponse);
  TestValidator.equals(
    "expired status filter should match data length",
    expiredResponse.pagination.records,
    expiredResponse.data.length,
  );
  // 7. Test status filter with 'deleted'
  const deletedParams = {
    status: "deleted",
  } satisfies IMultiUserTodoGuest.IRequest;
  const deletedResponse = await api.functional.multiUserTodo.guests.index(
    connection,
    {
      body: deletedParams,
    },
  );
  typia.assert(deletedResponse);
  TestValidator.equals(
    "deleted status filter should match data length",
    deletedResponse.pagination.records,
    deletedResponse.data.length,
  );
  // 8. Verify ordering by created_at descending (most recent first)
  if (defaultResponse.data.length > 1) {
    for (let i = 1; i < defaultResponse.data.length; i++) {
      const prevDate = new Date(defaultResponse.data[i - 1].created_at);
      const currDate = new Date(defaultResponse.data[i].created_at);
      TestValidator.predicate(
        "results should be ordered by created_at descending",
        prevDate >= currDate,
      );
    }
  }
  // 9. Test unique IDs
  if (defaultResponse.data.length > 1) {
    const ids = defaultResponse.data.map((guest) => guest.id);
    const uniqueIds = new Set(ids);
    TestValidator.equals(
      "all guest IDs should be unique",
      uniqueIds.size,
      ids.length,
    );
  }
  // 10. Test maximum limit value
  const maxLimitParams = {
    limit: 100,
  } satisfies IMultiUserTodoGuest.IRequest;
  const maxLimitResponse = await api.functional.multiUserTodo.guests.index(
    connection,
    {
      body: maxLimitParams,
    },
  );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "maximum limit should be 100",
    maxLimitResponse.pagination.limit,
    100,
  );
  // 11. Test minimum limit value
  const minLimitParams = {
    limit: 1,
  } satisfies IMultiUserTodoGuest.IRequest;
  const minLimitResponse = await api.functional.multiUserTodo.guests.index(
    connection,
    {
      body: minLimitParams,
    },
  );
  typia.assert(minLimitResponse);
  TestValidator.equals(
    "minimum limit should be 1",
    minLimitResponse.pagination.limit,
    1,
  );
}
