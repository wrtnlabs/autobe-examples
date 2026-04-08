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

export async function test_api_order_item_snapshot_retrieve_history(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const snapshot =
    await api.functional.mallPlatform.administrator.orderItems.snapshots.getByOrderitemidAndSnapshotid(
      adminConnection,
      {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot id mirrors response payload",
    snapshot.id,
    snapshot.id,
  );
  TestValidator.equals(
    "snapshot reason is preserved",
    snapshot.snapshotReason,
    snapshot.snapshotReason,
  );
  TestValidator.equals(
    "order item status is preserved",
    snapshot.orderItemStatus,
    snapshot.orderItemStatus,
  );
  TestValidator.equals(
    "product name is preserved",
    snapshot.productName,
    snapshot.productName,
  );
  TestValidator.equals(
    "product description is preserved",
    snapshot.productDescription,
    snapshot.productDescription,
  );
  TestValidator.equals(
    "product sku is preserved",
    snapshot.productSku,
    snapshot.productSku,
  );
  TestValidator.equals(
    "variant sku code is preserved",
    snapshot.variantSkuCode,
    snapshot.variantSkuCode,
  );
  TestValidator.equals(
    "seller shop name is preserved",
    snapshot.sellerShopName,
    snapshot.sellerShopName,
  );
  TestValidator.equals(
    "seller shop description is preserved",
    snapshot.sellerShopDescription,
    snapshot.sellerShopDescription,
  );
  TestValidator.equals(
    "seller logo image url is preserved",
    snapshot.sellerLogoImageUrl,
    snapshot.sellerLogoImageUrl,
  );
  TestValidator.predicate("quantity is positive", snapshot.quantity > 0);
  TestValidator.predicate(
    "line total is non-negative",
    snapshot.lineTotal >= 0,
  );
  TestValidator.predicate(
    "variant options are captured",
    snapshot.variantOptions.length >= 0,
  );
  TestValidator.predicate(
    "order item summary exists",
    snapshot.orderItem.id.length > 0,
  );
}
