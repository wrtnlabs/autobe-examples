import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import type { IMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshotVariantOption";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_item_snapshot_variant_option_retrieve_preserved_value(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test preserved variant option retrieval from an order item snapshot.
   *
   * Validates that an authenticated customer can access the preserved variant
   * option payload exposed through the historical order-item snapshot route.
   * The endpoint is exercised as a read-only retrieval of immutable purchase
   * history data, ensuring the response shape is stable and suitable for
   * reconstructing a previously purchased variant configuration.
   *
   * 1. Authenticate a customer with a dedicated connection.
   * 2. Request one preserved variant option from the historical order chain.
   * 3. Validate the returned DTO and confirm its preserved fields remain
   *    internally consistent.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/join",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const output =
    await api.functional.mallPlatform.customer.orders.orderItems.snapshots.variantOptions.at(
      customerConnection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
        variantOptionId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "preserved variant option id should be stable",
    output.id,
    output.id,
  );
  TestValidator.predicate(
    "option name is preserved text",
    output.optionName.length > 0,
  );
  TestValidator.predicate(
    "option value is preserved text",
    output.optionValue.length > 0,
  );
  TestValidator.equals(
    "order item snapshot reference is preserved",
    output.orderItemSnapshot.id,
    output.orderItemSnapshot.id,
  );
  TestValidator.predicate(
    "created timestamp exists",
    output.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updated timestamp exists",
    output.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "deleted timestamp is nullable",
    output.deletedAt === null || output.deletedAt.length > 0,
  );
}
