import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_order_item_snapshot_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Retrieves an authenticated seller's order item snapshot history.
   *
   * This test verifies that the seller-scoped order item snapshot endpoint
   * returns a paginated, immutable history collection for a specific order item.
   *
   * Because the available SDK surface in this test context does not expose the
   * upstream order-creation flow, the test focuses on the authenticated read
   * path and validates the historical response structure, pagination metadata,
   * and preserved purchase-context fields.
   *
   * 1. Register and authenticate a seller using a dedicated seller connection.
   * 2. Request the snapshot history for a valid order item identifier.
   * 3. Validate pagination metadata and snapshot history payload shape.
   * 4. Confirm each snapshot record exposes preserved historical purchase data.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const output =
    await api.functional.mallPlatform.seller.orderItems.snapshots.getByOrderitemid(
      sellerConnection,
      {
        orderItemId,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "snapshot history response is a page",
    output.pagination.current >= 0 &&
      output.pagination.limit >= 0 &&
      output.pagination.records >= 0 &&
      output.pagination.pages >= 0,
    true,
  );
  TestValidator.equals(
    "snapshot history returns an array payload",
    Array.isArray(output.data),
    true,
  );
  TestValidator.predicate(
    "snapshot history is scoped to the requested order item",
    output.data.every((snapshot) => snapshot.orderItem.id === orderItemId),
  );
  TestValidator.predicate(
    "snapshot history is newest-first or empty",
    output.data.length <= 1 ||
      output.data.every(
        (snapshot, index, array) =>
          index === 0 ||
          new Date(array[index - 1].snapshotAt).getTime() >=
            new Date(snapshot.snapshotAt).getTime(),
      ),
  );
  TestValidator.predicate(
    "each snapshot preserves historical purchase context",
    output.data.every(
      (snapshot) =>
        snapshot.snapshotReason.length > 0 &&
        snapshot.productName.length > 0 &&
        snapshot.productDescription.length > 0 &&
        snapshot.productSku.length > 0 &&
        snapshot.variantSkuCode.length > 0 &&
        snapshot.sellerShopName.length > 0 &&
        snapshot.sellerShopDescription.length > 0 &&
        snapshot.sellerLogoImageUrl.length > 0 &&
        snapshot.unitPrice >= 0 &&
        snapshot.quantity > 0 &&
        snapshot.lineTotal === snapshot.unitPrice * snapshot.quantity &&
        snapshot.createdAt.length > 0 &&
        snapshot.updatedAt.length > 0 &&
        (snapshot.deletedAt === null || snapshot.deletedAt.length > 0) &&
        snapshot.orderItem.quantity > 0 &&
        snapshot.orderItem.status.length > 0 &&
        snapshot.orderItem.created_at.length > 0 &&
        snapshot.orderItem.updated_at.length > 0 &&
        (snapshot.orderItem.deleted_at === null ||
          snapshot.orderItem.deleted_at.length > 0),
    ),
  );
}
