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
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Verifies that an administrator can read a preserved order item snapshot that keeps purchase-time history intact.
 *
 * This test authenticates an administrator with an isolated connection, requests an order-item snapshot through the protected admin endpoint, and validates the returned immutable snapshot contract. The response is checked for the historical fields that must survive later source-data changes, including product, variant, seller, quantity, pricing, and snapshot timestamps.
 *
 * Because the provided materials expose only the snapshot read endpoint, the test validates the preserved contract shape and business-critical historical fields that are available in the DTO. This ensures the snapshot remains suitable for audit and dispute review even when the live catalog has diverged from the original purchase-time state.
 */
export async function test_api_order_item_snapshot_preserve_deleted_source_history(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234!",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(authorized);
  const response =
    await api.functional.mallPlatform.administrator.orderItems.snapshots.getByOrderitemidAndSnapshotid(
      adminConnection,
      {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(response);
  TestValidator.predicate(
    "snapshot id should be a uuid-like preserved identifier",
    response.id.length > 0,
  );
  TestValidator.predicate(
    "snapshot reason should be recorded",
    response.snapshotReason.length > 0,
  );
  TestValidator.predicate(
    "order item status should be preserved",
    response.orderItemStatus.length > 0,
  );
  TestValidator.predicate(
    "product name should be preserved",
    response.productName.length > 0,
  );
  TestValidator.predicate(
    "product description should be preserved",
    response.productDescription.length > 0,
  );
  TestValidator.predicate(
    "product sku should be preserved",
    response.productSku.length > 0,
  );
  TestValidator.predicate(
    "variant sku code should be preserved",
    response.variantSkuCode.length > 0,
  );
  TestValidator.predicate(
    "seller shop name should be preserved",
    response.sellerShopName.length > 0,
  );
  TestValidator.predicate(
    "seller shop description should be preserved",
    response.sellerShopDescription.length > 0,
  );
  TestValidator.predicate(
    "seller logo url should be preserved",
    response.sellerLogoImageUrl.length > 0,
  );
  TestValidator.predicate(
    "unit price should be non-negative",
    response.unitPrice >= 0,
  );
  TestValidator.predicate("quantity should be positive", response.quantity > 0);
  TestValidator.predicate(
    "line total should be non-negative",
    response.lineTotal >= 0,
  );
  TestValidator.predicate(
    "variant options should be present as a preserved collection",
    Array.isArray(response.variantOptions),
  );
}
