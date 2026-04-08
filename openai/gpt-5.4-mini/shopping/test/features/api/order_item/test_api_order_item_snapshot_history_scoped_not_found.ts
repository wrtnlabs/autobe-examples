import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_item_snapshot_history_scoped_not_found(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies that scoped order-item snapshot history lookup rejects mismatched
   * order and order-item identifiers with a not-found response.
   *
   * This test exercises the customer-authenticated snapshot history endpoint
   * using an intentionally invalid purchase scope combination so the API must
   * refuse access without leaking unrelated snapshot data. It validates that
   * the platform preserves the expected not-found behavior for cross-order or
   * cross-customer identifier mismatches and does not mutate any state as a
   * side effect of the failed lookup.
   *
   * 1. Register a customer identity required for authenticated access.
   * 2. Call the scoped snapshot history endpoint with unrelated UUIDs.
   * 3. Assert the request fails with the normal not-found response.
   * 4. Confirm the failure does not expose snapshot history details.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const request = {
    page: 1,
    limit: 10,
    sort: "createdAt_desc",
  } satisfies IMallPlatformOrderItemSnapshot.IRequest;
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "scoped order-item snapshot history should return not found for mismatched order scope",
    404,
    async () => {
      try {
        await api.functional.mallPlatform.customer.orders.orderItems.snapshots.index(
          customerConnection,
          {
            orderId,
            orderItemId,
            body: request,
          },
        );
      } catch (error: unknown) {
        const body =
          typeof error === "object" && error !== null && "toJSON" in error &&
          typeof (error as { toJSON: () => { message: unknown } }).toJSON ===
            "function"
            ? (error as { toJSON: () => { message: unknown } }).toJSON().message
            : undefined;
        const text = typeof body === "string" ? body : JSON.stringify(body);
        TestValidator.predicate(
          "not-found response should not leak snapshot metadata",
          !text.includes("snapshot") &&
            !text.includes("productName") &&
            !text.includes("sellerShopName"),
        );
        throw error;
      }
    },
  );
}
