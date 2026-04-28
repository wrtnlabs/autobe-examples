import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer address retrieval with default pagination and sorting.
 *
 * Validates the customer address index endpoint by authenticating a new customer and retrieving
 * their shipping addresses using a PATCH request. The test ensures the response contains valid
 * pagination metadata and address data arrays. Specifically verified are pagination fields
 * (current, limit, records, pages) consistency and that the sort parameter enforces created_at
 * descending order when specified.
 *
 * 1. Authenticate a customer via join.
 * 2. Call PATCH /ecommercePlatform/customer/addresses with sort parameter.
 * 3. Validate response pagination metadata structure and constraints.
 * 4. Verify data array presence and sort correctness.
 */
export async function test_api_customer_address_retrieve_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Prepare request with sort parameter
  const requestConfig = typia.random<{
    recipient_name?: string | undefined;
    phone_number?: string | undefined;
    is_default?: boolean | undefined;
    minCreatedAt?: (string & tags.Format<"date-time">) | undefined;
    maxCreatedAt?: (string & tags.Format<"date-time">) | undefined;
    sort?: string | undefined;
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  }>();
  requestConfig.sort = "created_at DESC";
  // 3. Retrieve addresses
  const response =
    await api.functional.ecommercePlatform.customer.addresses.index(
      customerConnection,
      {
        body: requestConfig,
      },
    );
  typia.assert(response);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination has valid current page",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.equals(
    "pagination pages matches calculated value from records and limit",
    response.pagination.pages,
    response.pagination.limit === 0
      ? 0
      : Math.ceil(response.pagination.records / response.pagination.limit),
  );
  TestValidator.predicate("data is an array", Array.isArray(response.data));
  // 5. Verify sorting by created_at descending
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const currentTimestamp = new Date(response.data[i].created_at).getTime();
      const nextTimestamp = new Date(response.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `address at index ${i} created_at is greater than or equal to address at index ${i + 1} created_at for descending sort`,
        currentTimestamp >= nextTimestamp,
      );
    }
  }
}
