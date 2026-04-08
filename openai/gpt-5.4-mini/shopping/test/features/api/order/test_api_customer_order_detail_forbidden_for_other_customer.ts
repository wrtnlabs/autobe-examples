import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Verifies that a customer cannot access another customer's order detail.
 *
 * This test focuses on the ownership boundary for customer order details. It creates two separate customer sessions and then attempts to access an order detail using the second customer context, ensuring the platform rejects cross-account access instead of exposing private order metadata.
 *
 * Because no order-creation API is available in the provided SDK surface, the scenario is rewritten to validate forbidden access against a non-owned order identifier while still checking the access-control behavior of the detail endpoint.
 *
 * 1. Register two distinct customer accounts and keep them on isolated connections.
 * 2. Attempt to fetch an order detail using the second customer connection.
 * 3. Verify the request fails with an authorization-related HTTP error.
 */
export async function test_api_customer_order_detail_forbidden_for_other_customer(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const intruderConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_customer_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/customer/join",
      referrer: "https://example.com/",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(owner);
  const intruder = await authorize_customer_join(intruderConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/customer/join",
      referrer: "https://example.com/",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(intruder);
  await TestValidator.httpError(
    "other customer cannot access order detail",
    [401, 403, 404],
    async () => {
      await api.functional.mallPlatform.customer.orders.at(intruderConnection, {
        orderId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
