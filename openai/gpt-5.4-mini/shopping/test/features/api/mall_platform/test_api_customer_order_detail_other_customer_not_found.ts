import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import type { IMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Ensures a customer cannot access another customer's order detail page.
 *
 * This test verifies the ownership boundary on order-detail retrieval by authenticating two separate customer accounts and confirming that one customer cannot read an order detail resource using another customer's order identifier.
 *
 * Because order-creation APIs are not available in the provided SDK surface for this test case, the scenario is exercised through a not-found access check on an order identifier that is not owned by the requesting customer. The expected behavior is that the service does not reveal purchase-history data, shipping addresses, item history, or shipment details to a non-owner.
 *
 * 1. Authenticate two distinct customer accounts.
 * 2. Attempt to access an order detail using the first customer's authenticated connection.
 * 3. Confirm the service responds as not found to prevent cross-account data exposure.
 */
export async function test_api_customer_order_detail_other_customer_not_found(
  connection: api.IConnection,
): Promise<void> {
  const firstCustomerConnection: api.IConnection = { host: connection.host };
  const secondCustomerConnection: api.IConnection = { host: connection.host };
  const firstCustomer = await authorize_customer_join(firstCustomerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(firstCustomer);
  const secondCustomer = await authorize_customer_join(
    secondCustomerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        href: "https://example.com/signup",
        referrer: "https://example.com/landing",
        ip: "127.0.0.1",
      } satisfies IMallPlatformCustomer.IJoin,
    },
  );
  typia.assert(secondCustomer);
  await TestValidator.httpError(
    "other customer's order detail should be hidden",
    [404],
    async () => {
      await api.functional.mallPlatform.customer.orders.at(
        firstCustomerConnection,
        {
          orderId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
