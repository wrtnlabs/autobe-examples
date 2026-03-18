import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsGuest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_index_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Default pagination (page 1, limit 20)
  const basePageRequest = {
    page: 1,
    limit: 20,
  } satisfies IHrmsGuest.IRequest;
  const defaultPageResponse = await api.functional.hrms.guests.index(
    connection,
    {
      body: basePageRequest,
    },
  );
  typia.assert(defaultPageResponse);
  typia.assert(defaultPageResponse.pagination);
  TestValidator.equals(
    "default page is 1",
    defaultPageResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit is 20",
    defaultPageResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "has non-negative records",
    defaultPageResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    defaultPageResponse.pagination.pages ===
      (defaultPageResponse.pagination.records === 0
        ? 0
        : Math.ceil(
            defaultPageResponse.pagination.records /
              defaultPageResponse.pagination.limit,
          )),
  );
  // Test 2: Page 2 verification
  const page2Request = {
    page: 2,
    limit: 20,
  } satisfies IHrmsGuest.IRequest;
  const page2Response = await api.functional.hrms.guests.index(connection, {
    body: page2Request,
  });
  typia.assert(page2Response);
  typia.assert(page2Response.pagination);
  TestValidator.equals("page 2 current", page2Response.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 20);
  // Test 3: Limit boundary test - limit 1
  const limit1Request = {
    page: 1,
    limit: 1,
  } satisfies IHrmsGuest.IRequest;
  const limit1Response = await api.functional.hrms.guests.index(connection, {
    body: limit1Request,
  });
  typia.assert(limit1Response);
  typia.assert(limit1Response.pagination);
  TestValidator.equals("limit 1 current", limit1Response.pagination.current, 1);
  TestValidator.equals("limit 1 limit", limit1Response.pagination.limit, 1);
  TestValidator.predicate(
    "limit 1 data length",
    limit1Response.data.length <= 1,
  );
  // Test 4: Limit boundary test - limit 100
  const limit100Request = {
    page: 1,
    limit: 100,
  } satisfies IHrmsGuest.IRequest;
  const limit100Response = await api.functional.hrms.guests.index(connection, {
    body: limit100Request,
  });
  typia.assert(limit100Response);
  typia.assert(limit100Response.pagination);
  TestValidator.equals(
    "limit 100 current",
    limit100Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit 100 limit",
    limit100Response.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "limit 100 data length",
    limit100Response.data.length <= 100,
  );
  // Test 5: Multiple pages verification
  const page3Request = {
    page: 3,
    limit: 20,
  } satisfies IHrmsGuest.IRequest;
  const page3Response = await api.functional.hrms.guests.index(connection, {
    body: page3Request,
  });
  typia.assert(page3Response);
  typia.assert(page3Response.pagination);
  TestValidator.equals("page 3 current", page3Response.pagination.current, 3);
  TestValidator.equals("page 3 limit", page3Response.pagination.limit, 20);
  // Test 6: Data array is proper array of ISummary
  for (const guest of defaultPageResponse.data) {
    typia.assert(guest);
    // Validate each guest has required fields
    typeof guest.id === "string";
    typeof guest.device_fingerprint === "string";
    typeof guest.created_at === "string";
  }
  // Test 7: Beyond last page handling
  const beyondLastPageRequest = {
    page: 9999,
    limit: 20,
  } satisfies IHrmsGuest.IRequest;
  const beyondLastPageResponse = await api.functional.hrms.guests.index(
    connection,
    {
      body: beyondLastPageRequest,
    },
  );
  typia.assert(beyondLastPageResponse);
  typia.assert(beyondLastPageResponse.pagination);
  TestValidator.equals(
    "beyond last page current",
    beyondLastPageResponse.pagination.current,
    9999,
  );
  TestValidator.equals(
    "beyond last page limit",
    beyondLastPageResponse.pagination.limit,
    20,
  );
  // Data should be empty when beyond total pages
  TestValidator.equals(
    "beyond last page data is empty",
    beyondLastPageResponse.data.length,
    0,
  );
}
