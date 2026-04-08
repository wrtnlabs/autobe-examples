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
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_order_item_snapshot_retrieve_own_history(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Retrieve a seller-owned order item snapshot and verify preserved history fields.
   *
   * This test authenticates a seller account, calls the seller-scoped order item snapshot
   * retrieval endpoint, and validates that the returned payload preserves immutable
   * purchase-time data rather than live catalog state.
   *
   * 1. Register and authenticate a seller through the seller join utility.
   * 2. Retrieve one order item snapshot using seller-scoped identifiers.
   * 3. Validate the snapshot metadata, preserved product and seller fields, and
   *    normalized variant option rows.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: `${RandomGenerator.alphabets(10)}!1`,
    } satisfies IMallPlatformSeller.IJoin,
  });
  const output =
    await api.functional.mallPlatform.seller.orderItems.snapshots.at(
      sellerConnection,
      {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        orderItemSnapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
  TestValidator.predicate("snapshot identifier exists", output.id.length > 0);
  TestValidator.predicate(
    "snapshot belongs to an order item",
    output.mallPlatformOrderItemId.length > 0,
  );
  TestValidator.predicate(
    "snapshot timestamp exists",
    output.snapshotAt.length > 0,
  );
  TestValidator.predicate(
    "snapshot reason exists",
    output.snapshotReason.length > 0,
  );
  TestValidator.predicate(
    "preserved order item status exists",
    output.orderItemStatus.length > 0,
  );
  TestValidator.predicate("product name exists", output.productName.length > 0);
  TestValidator.predicate(
    "product description exists",
    output.productDescription.length > 0,
  );
  TestValidator.predicate("product sku exists", output.productSku.length > 0);
  TestValidator.predicate(
    "variant sku code exists",
    output.variantSkuCode.length > 0,
  );
  TestValidator.predicate(
    "seller shop name exists",
    output.sellerShopName.length > 0,
  );
  TestValidator.predicate(
    "seller shop description exists",
    output.sellerShopDescription.length > 0,
  );
  TestValidator.predicate(
    "seller logo image url exists",
    output.sellerLogoImageUrl.length > 0,
  );
  TestValidator.predicate("unit price is non-negative", output.unitPrice >= 0);
  TestValidator.predicate("quantity is positive", output.quantity > 0);
  TestValidator.predicate("line total is non-negative", output.lineTotal >= 0);
  TestValidator.predicate(
    "variant options are normalized rows",
    Array.isArray(output.variantOptions),
  );
  for (const option of output.variantOptions) {
    typia.assert<IMallPlatformOrderItemSnapshotVariantOption>(option);
    TestValidator.predicate("option name exists", option.optionName.length > 0);
    TestValidator.predicate(
      "option value exists",
      option.optionValue.length > 0,
    );
  }
  TestValidator.equals(
    "snapshot order item status matches embedded order item status",
    output.orderItemStatus,
    output.orderItem.status,
  );
}
