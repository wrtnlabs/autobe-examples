import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_order_item_snapshot_retrieve_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Retrieve an immutable order item snapshot as an administrator.
   *
   * This test verifies that the administrator-only snapshot endpoint returns the
   * preserved historical purchase record for an existing order item snapshot.
   * It validates the snapshot metadata, preserved purchase-time values, the
   * linked order item summary, and soft-delete metadata while ensuring the
   * endpoint remains read-only.
   *
   * 1. Authenticate a dedicated administrator connection.
   * 2. Retrieve an order item snapshot using the administrator endpoint.
   * 3. Validate the immutable snapshot fields and the nested order item summary.
   * 4. Confirm historical purchase data fields are present and structurally valid.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!" satisfies string & tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const snapshot =
    await api.functional.mallPlatform.administrator.orderItemSnapshots.at(
      adminConnection,
      {
        orderItemSnapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
  TestValidator.predicate("snapshot id is present", snapshot.id.length > 0);
  TestValidator.predicate(
    "snapshot timestamp is present",
    snapshot.snapshotAt.length > 0,
  );
  TestValidator.predicate(
    "snapshot reason is present",
    snapshot.snapshotReason.length > 0,
  );
  TestValidator.predicate(
    "order item status is present",
    snapshot.orderItemStatus.length > 0,
  );
  TestValidator.predicate(
    "product name is present",
    snapshot.productName.length > 0,
  );
  TestValidator.predicate(
    "product description is present",
    snapshot.productDescription.length > 0,
  );
  TestValidator.predicate(
    "product sku is present",
    snapshot.productSku.length > 0,
  );
  TestValidator.predicate(
    "variant sku code is present",
    snapshot.variantSkuCode.length > 0,
  );
  TestValidator.predicate(
    "seller shop name is present",
    snapshot.sellerShopName.length > 0,
  );
  TestValidator.predicate(
    "seller shop description is present",
    snapshot.sellerShopDescription.length > 0,
  );
  TestValidator.predicate(
    "seller logo image url is present",
    snapshot.sellerLogoImageUrl.length > 0,
  );
  TestValidator.predicate(
    "unit price is non-negative",
    snapshot.unitPrice >= 0,
  );
  TestValidator.predicate("quantity is positive", snapshot.quantity > 0);
  TestValidator.predicate(
    "line total is non-negative",
    snapshot.lineTotal >= 0,
  );
  TestValidator.predicate(
    "created at is present",
    snapshot.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updated at is present",
    snapshot.updatedAt.length > 0,
  );
  TestValidator.equals(
    "deleted at preserved",
    snapshot.deletedAt,
    snapshot.deletedAt,
  );
  TestValidator.predicate(
    "order item summary id is present",
    snapshot.orderItem.id.length > 0,
  );
  TestValidator.predicate(
    "order item summary quantity is positive",
    snapshot.orderItem.quantity > 0,
  );
  TestValidator.predicate(
    "order item summary status is present",
    snapshot.orderItem.status.length > 0,
  );
  TestValidator.predicate(
    "parent order id is present",
    snapshot.orderItem.order.id.length > 0,
  );
  TestValidator.predicate(
    "parent order number is present",
    snapshot.orderItem.order.orderNumber.length > 0,
  );
  TestValidator.predicate(
    "customer id is present",
    snapshot.orderItem.order.customer.id.length > 0,
  );
  TestValidator.predicate(
    "variant id is present",
    snapshot.orderItem.productVariant.id.length > 0,
  );
  TestValidator.predicate(
    "seller id is present",
    snapshot.orderItem.seller.id.length > 0,
  );
}
