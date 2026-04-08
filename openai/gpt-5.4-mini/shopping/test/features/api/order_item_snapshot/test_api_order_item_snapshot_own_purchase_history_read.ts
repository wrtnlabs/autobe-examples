import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import type { IMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshotVariantOption";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_item_snapshot_own_purchase_history_read(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test reading an authenticated customer's preserved order item snapshot.
   *
   * This validates the customer history endpoint contract for immutable purchase snapshots, ensuring the response preserves the historical order item reference and snapshot metadata without attempting any mutation.
   *
   * 1. Create a dedicated customer connection and register a customer account.
   * 2. Request an order item snapshot by UUID through the customer-authenticated connection.
   * 3. Validate the returned snapshot structure and the immutable preserved fields defined by the API contract.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const snapshot =
    await api.functional.mallPlatform.customer.orderItemSnapshots.at(
      customerConnection,
      { orderItemSnapshotId: typia.random<string & tags.Format<"uuid">>() },
    );
  typia.assert(snapshot);
  TestValidator.predicate(
    "snapshot id should be a uuid string",
    snapshot.id.length > 0,
  );
  TestValidator.predicate(
    "snapshot captures the linked order item reference",
    snapshot.orderItem.id.length > 0,
  );
  TestValidator.predicate(
    "snapshot captures the time of capture",
    snapshot.snapshotAt.length > 0,
  );
  TestValidator.predicate(
    "snapshot captures the reason it was created",
    snapshot.snapshotReason.length > 0,
  );
  TestValidator.predicate(
    "snapshot preserves the order item status at capture time",
    snapshot.orderItemStatus.length > 0,
  );
  TestValidator.predicate(
    "snapshot preserves the product name",
    snapshot.productName.length > 0,
  );
  TestValidator.predicate(
    "snapshot preserves the product description",
    snapshot.productDescription.length > 0,
  );
  TestValidator.predicate(
    "snapshot preserves the product sku",
    snapshot.productSku.length > 0,
  );
  TestValidator.predicate(
    "snapshot preserves the variant sku code",
    snapshot.variantSkuCode.length > 0,
  );
  TestValidator.predicate(
    "snapshot preserves the seller shop name",
    snapshot.sellerShopName.length > 0,
  );
  TestValidator.predicate(
    "snapshot preserves the seller shop description",
    snapshot.sellerShopDescription.length > 0,
  );
  TestValidator.predicate(
    "snapshot preserves the seller logo url",
    snapshot.sellerLogoImageUrl.length > 0,
  );
  TestValidator.predicate(
    "snapshot unit price is non-negative",
    snapshot.unitPrice >= 0,
  );
  TestValidator.predicate(
    "snapshot quantity is positive",
    snapshot.quantity > 0,
  );
  TestValidator.predicate(
    "snapshot line total is non-negative",
    snapshot.lineTotal >= 0,
  );
  TestValidator.predicate(
    "snapshot includes normalized variant options",
    Array.isArray(snapshot.variantOptions),
  );
  TestValidator.predicate(
    "snapshot created timestamp is present",
    snapshot.createdAt.length > 0,
  );
  TestValidator.predicate(
    "snapshot updated timestamp is present",
    snapshot.updatedAt.length > 0,
  );
  TestValidator.equals(
    "snapshot deletion marker should remain null",
    snapshot.deletedAt,
    null,
  );
}
