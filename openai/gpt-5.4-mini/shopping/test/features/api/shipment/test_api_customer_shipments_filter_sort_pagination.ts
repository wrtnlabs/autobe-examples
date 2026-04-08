import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_shipments_filter_sort_pagination(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: "password1234",
      href: "https://example.com/join",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const defaultResponse =
    await api.functional.mallPlatform.customer.shipments.index(
      customerConnection,
      {
        body: {} satisfies IMallPlatformShipment.IRequest,
      },
    );
  typia.assert(defaultResponse);
  const filteredRequest = {
    page: 1,
    limit: 10,
    search: RandomGenerator.alphabets(4),
    sort: "newest",
    status: "shipped",
  } satisfies IMallPlatformShipment.IRequest;
  const filteredResponse =
    await api.functional.mallPlatform.customer.shipments.index(
      customerConnection,
      { body: filteredRequest },
    );
  typia.assert(filteredResponse);
  const repeatedResponse =
    await api.functional.mallPlatform.customer.shipments.index(
      customerConnection,
      { body: filteredRequest },
    );
  typia.assert(repeatedResponse);
  const nextPageResponse =
    await api.functional.mallPlatform.customer.shipments.index(
      customerConnection,
      {
        body: {
          ...filteredRequest,
          page: 2,
        } satisfies IMallPlatformShipment.IRequest,
      },
    );
  typia.assert(nextPageResponse);
  TestValidator.predicate(
    "default pagination records should be non-negative",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "default pagination pages should be non-negative",
    defaultResponse.pagination.pages >= 0,
  );
  TestValidator.equals(
    "filtered pagination current page should match request",
    filteredResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "filtered pagination limit should match request",
    filteredResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "repeated request should produce same pagination current",
    filteredResponse.pagination.current,
    repeatedResponse.pagination.current,
  );
  TestValidator.equals(
    "repeated request should produce same pagination limit",
    filteredResponse.pagination.limit,
    repeatedResponse.pagination.limit,
  );
  TestValidator.equals(
    "repeated request should produce same pagination records",
    filteredResponse.pagination.records,
    repeatedResponse.pagination.records,
  );
  TestValidator.equals(
    "repeated request should produce same pagination pages",
    filteredResponse.pagination.pages,
    repeatedResponse.pagination.pages,
  );
  TestValidator.equals(
    "next page request should reflect requested page",
    nextPageResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "next page request should preserve page size",
    nextPageResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "filtered pagination records should be non-negative",
    filteredResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "filtered pagination pages should be coherent",
    filteredResponse.pagination.records === 0
      ? filteredResponse.pagination.pages === 0
      : filteredResponse.pagination.pages >= 1,
  );
}
