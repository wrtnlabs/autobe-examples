import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
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

/**
 * Browse seller order item snapshot history in newest-first order.
 *
 * Validates that an authenticated seller can access the immutable order item snapshot history endpoint and receive a paginated read-only list response.
 *
 * The test focuses on the seller-only browsing contract, pagination metadata, and default newest-first ordering across the returned page. It also verifies that the response behaves as history data rather than a mutable resource and that preserved snapshot records expose the expected read-only summary structure.
 *
 * 1. Register a seller account and establish a seller-authenticated session.
 * 2. Request the order item snapshot history with paging controls only.
 * 3. Validate pagination metadata and confirm the snapshot list is ordered from newest to oldest.
 * 4. Confirm the returned rows are immutable history summaries with nested order item context.
 */
export async function test_api_order_item_snapshot_history_browse_latest_first(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = `${RandomGenerator.alphabets(8)}@example.com`;
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: "1234",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorized);
  const output =
    await api.functional.mallPlatform.seller.orderItemSnapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.predicate(
    "pagination metadata is present",
    output.pagination.current >= 1 &&
      output.pagination.limit >= 1 &&
      output.pagination.records >= 0 &&
      output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "response data is paginated history rows",
    Array.isArray(output.data),
  );
  TestValidator.predicate("snapshot history is sorted newest first", () => {
    for (let index = 1; index < output.data.length; ++index) {
      if (output.data[index - 1].snapshotAt < output.data[index].snapshotAt)
        return false;
    }
    return true;
  });
  if (output.data.length > 0) {
    const first = output.data[0];
    TestValidator.predicate(
      "first history row preserves snapshot metadata",
      first.snapshotAt.length > 0 &&
        first.snapshotReason.length > 0 &&
        first.orderItemStatus.length > 0 &&
        first.productName.length > 0 &&
        first.productDescription.length > 0 &&
        first.productSku.length > 0 &&
        first.variantSkuCode.length > 0 &&
        first.sellerShopName.length > 0 &&
        first.sellerShopDescription.length > 0 &&
        first.sellerLogoImageUrl.length > 0 &&
        first.quantity > 0 &&
        first.lineTotal >= 0 &&
        first.orderItem.id.length > 0 &&
        first.orderItem.order.id.length > 0 &&
        first.orderItem.productVariant.id.length > 0 &&
        first.orderItem.seller.id.length > 0,
    );
  }
}
