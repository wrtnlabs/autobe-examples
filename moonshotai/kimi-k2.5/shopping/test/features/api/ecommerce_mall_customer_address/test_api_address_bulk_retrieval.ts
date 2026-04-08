import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_addresses_create";
import { prepare_random_ecommerce_mall_customer } from "../../../prepare/prepare_random_ecommerce_mall_customer";

/**
 * Test customer address bulk retrieval with pagination.
 *
 * 1. Register a new customer
 * 2. Create 4 shipping addresses for the customer
 * 3. Retrieve all addresses without pagination (verify structure)
 * 4. Retrieve addresses with pagination (page=1, limit=2)
 * 5. Navigate to page 2 and verify remaining addresses
 * 6. Validate pagination metadata correctness
 */
export async function test_api_address_bulk_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create 4 shipping addresses using the utility generator
  const createdAddresses: IEcommerceMallCustomer[] =
    await ArrayUtil.asyncRepeat(4, async () => {
      return generate_random_ecommerce_mall_customer_addresses_create(
        customerConnection,
        {},
      );
    });
  typia.assert(createdAddresses);
  // Verify we created exactly 4 addresses
  TestValidator.equals("created count", createdAddresses.length, 4);
  // 3. Retrieve all addresses without pagination filters
  const allAddresses =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallCustomer.IRequest,
      },
    );
  typia.assert(allAddresses);
  // Verify pagination structure and total count
  TestValidator.equals("total records", allAddresses.pagination.records, 4);
  TestValidator.equals("current page", allAddresses.pagination.current, 1);
  TestValidator.equals("len", allAddresses.pagination.limit, 10);
  TestValidator.equals("total pages", allAddresses.pagination.pages, 1);
  TestValidator.equals("data array length", allAddresses.data.length, 4);
  // 4. Test pagination with limit=2 (page 1)
  const page1Result =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IEcommerceMallCustomer.IRequest,
      },
    );
  typia.assert(page1Result);
  TestValidator.equals("page 1 current", page1Result.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 2);
  TestValidator.equals("page 1 records", page1Result.pagination.records, 4);
  TestValidator.equals("page 1 total pages", page1Result.pagination.pages, 2);
  TestValidator.equals("page 1 data length", page1Result.data.length, 2);
  // 5. Navigate to page 2 with limit=2
  const page2Result =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          page: 2,
          limit: 2,
        } satisfies IEcommerceMallCustomer.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, 2);
  TestValidator.equals("page 2 records", page2Result.pagination.records, 4);
  TestValidator.equals("page 2 total pages", page2Result.pagination.pages, 2);
  TestValidator.equals("page 2 data length", page2Result.data.length, 2);
  // Verify total data consistency: page1 + page2 = total
  const totalRetrieved = page1Result.data.length + page2Result.data.length;
  TestValidator.equals("total retrieved matches", totalRetrieved, 4);
  // 6. Test with default pagination (no page/limit specified)
  const defaultResult =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      {
        body: {} satisfies IEcommerceMallCustomer.IRequest,
      },
    );
  typia.assert(defaultResult);
  TestValidator.predicate(
    "default pagination has data",
    defaultResult.data.length <= 100,
  );
  TestValidator.equals(
    "default total records",
    defaultResult.pagination.records,
    4,
  );
}
