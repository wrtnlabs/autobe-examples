import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test customer list sorting by email address and registration date.
 *
 * **Scenario Flow:**
 * 1. Call PATCH /shoppingMall/customers with sort: email_asc to retrieve customers sorted alphabetically by email
 * 2. Call PATCH /shoppingMall/customers with sort: email_desc to retrieve customers sorted reverse-alphabetically by email
 * 3. Call PATCH /shoppingMall/customers with sort: created_at_asc to retrieve oldest customers first
 * 4. Call PATCH /shoppingMall/customers with sort: created_at_desc (default) to retrieve newest customers first
 * 5. Call PATCH /shoppingMall/customers without sort parameter to verify default behavior
 *
 * **Validations:**
 * - email_asc returns customers in ascending alphabetical order by email
 * - email_desc returns customers in descending alphabetical order by email
 * - created_at_asc returns customers with oldest registration first
 * - created_at_desc returns customers with newest registration first
 * - Default sort (no sort parameter) is created_at_desc (newest first)
 */
export async function test_api_customer_list_sort_order(
  connection: api.IConnection,
): Promise<void> {
  // Test email ascending sort
  const emailAsc = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: {
        sort: "email_asc",
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(emailAsc);
  // Verify email ascending order
  for (let i = 1; i < emailAsc.data.length; i++) {
    TestValidator.predicate(
      "email_asc order",
      emailAsc.data[i - 1].email.localeCompare(emailAsc.data[i].email) <= 0,
    );
  }
  // Test email descending sort
  const emailDesc = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: {
        sort: "email_desc",
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(emailDesc);
  // Verify email descending order
  for (let i = 1; i < emailDesc.data.length; i++) {
    TestValidator.predicate(
      "email_desc order",
      emailDesc.data[i - 1].email.localeCompare(emailDesc.data[i].email) >= 0,
    );
  }
  // Test created_at ascending sort
  const createdAsc = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: {
        sort: "created_at_asc",
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(createdAsc);
  // Verify created_at ascending order (oldest first)
  for (let i = 1; i < createdAsc.data.length; i++) {
    TestValidator.predicate(
      "created_at_asc order",
      createdAsc.data[i - 1].createdAt <= createdAsc.data[i].createdAt,
    );
  }
  // Test created_at descending sort
  const createdDesc = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: {
        sort: "created_at_desc",
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(createdDesc);
  // Verify created_at descending order (newest first)
  for (let i = 1; i < createdDesc.data.length; i++) {
    TestValidator.predicate(
      "created_at_desc order",
      createdDesc.data[i - 1].createdAt >= createdDesc.data[i].createdAt,
    );
  }
  // Test default sort (no sort parameter) - should be created_at_desc
  const defaultSort = await api.functional.shoppingMall.customers.index(
    connection,
    {
      body: {} satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(defaultSort);
  // Verify default is created_at_desc order (newest first)
  for (let i = 1; i < defaultSort.data.length; i++) {
    TestValidator.predicate(
      "default sort is created_at_desc",
      defaultSort.data[i - 1].createdAt >= defaultSort.data[i].createdAt,
    );
  }
  // Verify total record count is consistent across different sort options
  TestValidator.equals(
    "total record count consistent across sorts",
    emailAsc.pagination.records,
    emailDesc.pagination.records,
  );
  TestValidator.equals(
    "total record count consistent across sorts",
    emailAsc.pagination.records,
    createdAsc.pagination.records,
  );
  TestValidator.equals(
    "total record count consistent across sorts",
    emailAsc.pagination.records,
    createdDesc.pagination.records,
  );
}
