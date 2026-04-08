import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_address_list_pagination_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 2. Call address listing endpoint with pagination parameters
  const response = await api.functional.ecommerceMall.customer.addresses.index(
    customerConnection,
    {
      body: {
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IEcommerceMallShippingAddress.IRequest,
    },
  );
  typia.assert(response);
  // 3. Verify pagination metadata is present
  // Note: response.pagination is IPageIEcommerceMall.IPagination which wraps the actual pagination
  // The actual pagination info (current, limit, records, pages) is in response.pagination.pagination
  TestValidator.equals(
    "pagination exists",
    response.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "inner pagination exists",
    response.pagination.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "current page is 1",
    response.pagination.pagination.current,
    1,
  );
  TestValidator.equals("limit is 10", response.pagination.pagination.limit, 10);
  TestValidator.equals(
    "records is 0 (no addresses)",
    response.pagination.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages is 0 (no addresses)",
    response.pagination.pagination.pages,
    0,
  );
  // 4. Verify data array is empty but present
  TestValidator.equals(
    "data array exists",
    Array.isArray(response.pagination.data),
    true,
  );
  TestValidator.equals(
    "data array is empty",
    response.pagination.data.length,
    0,
  );
}
