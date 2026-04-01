import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShippingAddress";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_shipping_addresses_list(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const request = {
    page: 1,
    limit: 10,
    sort: "newest",
  } satisfies IMallPlatformShippingAddress.IRequest;
  const output =
    await api.functional.mallPlatform.customer.shipping_addresses.index(
      customerConnection,
      { body: request },
    );
  typia.assert(output);
  TestValidator.equals(
    "pagination current page should match request",
    output.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match request",
    output.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination record count should be non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination page count should be non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length should not exceed limit",
    output.data.length <= request.limit,
  );
  for (const address of output.data) {
    typia.assert(address);
    TestValidator.predicate(
      "shipping address should have recipient name",
      address.recipientName.length > 0,
    );
    TestValidator.predicate(
      "shipping address should have street address",
      address.streetAddress.length > 0,
    );
    TestValidator.predicate(
      "shipping address should have city",
      address.city.length > 0,
    );
    TestValidator.predicate(
      "shipping address should have country",
      address.country.length > 0,
    );
  }
}
