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

export async function test_api_shipping_address_list_customer_pagination(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234Abcd!",
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const page =
    await api.functional.mallPlatform.customer.shipping_addresses.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          search: RandomGenerator.alphabets(12),
          sort: "+createdAt",
        } satisfies IMallPlatformShippingAddress.IRequest,
      },
    );
  typia.assert(page);
  TestValidator.equals("pagination current page", page.pagination.current, 1);
  TestValidator.equals("pagination limit", page.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.equals(
    "data/page consistency",
    page.data.length <= page.pagination.limit,
    true,
  );
  for (const item of page.data) {
    TestValidator.equals("address owner id", item.customer.id, customer.id);
    TestValidator.equals(
      "address owner email",
      item.customer.email,
      customer.email,
    );
    TestValidator.equals(
      "address deleted at default state",
      item.deletedAt,
      null,
    );
    TestValidator.predicate(
      "summary retains default flag as boolean",
      typeof item.isDefault === "boolean",
    );
    TestValidator.predicate(
      "summary retains required text fields",
      item.recipientName.length > 0 &&
        item.phoneNumber.length > 0 &&
        item.streetAddress.length > 0 &&
        item.city.length > 0 &&
        item.stateProvince.length > 0 &&
        item.postalCode.length > 0 &&
        item.country.length > 0,
    );
  }
}
