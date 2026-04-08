import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
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

export async function test_api_shipping_addresses_list_paginated_browse(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      href: "https://example.com/signup",
      referrer: "https://example.com/",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const request = {
    page: 1,
    limit: 10,
  } satisfies IMallPlatformShippingAddress.IRequest;
  const output =
    await api.functional.mallPlatform.customer.shipping_addresses.index(
      customerConnection,
      {
        body: request,
      },
    );
  typia.assert(output);
  TestValidator.equals("pagination current page", output.pagination.current, 1);
  TestValidator.equals("pagination limit", output.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "returned page does not exceed requested limit",
    output.data.length <= request.limit,
  );
  TestValidator.predicate(
    "all returned addresses belong to the authenticated customer",
    output.data.every((address) => address.customer.id === authorized.id),
  );
  TestValidator.predicate(
    "each returned address includes checkout-ready recipient and location details",
    output.data.every(
      (address) =>
        address.recipientName.length > 0 &&
        address.phoneNumber.length > 0 &&
        address.streetAddress.length > 0 &&
        address.city.length > 0 &&
        address.stateProvince.length > 0 &&
        address.postalCode.length > 0 &&
        address.country.length > 0,
    ),
  );
  TestValidator.predicate(
    "address list preserves default selection markers when addresses exist",
    output.data.length === 0 ||
      output.data.some((address) => address.isDefault),
  );
}
