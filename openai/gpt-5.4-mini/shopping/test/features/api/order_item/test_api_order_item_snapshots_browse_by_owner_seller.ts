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

export async function test_api_order_item_snapshots_browse_by_owner_seller(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const output =
    await api.functional.mallPlatform.seller.orderItems.snapshots.index(
      sellerConnection,
      {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.predicate(
    "pagination current page should be positive",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    output.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    output.pagination.pages >= 0,
  );
  if (output.data.length > 1) {
    for (let i = 1; i < output.data.length; i++) {
      TestValidator.predicate(
        "snapshots should be ordered newest first by createdAt",
        output.data[i - 1].createdAt >= output.data[i].createdAt,
      );
      TestValidator.predicate(
        "snapshots should be ordered newest first by snapshotAt",
        output.data[i - 1].snapshotAt >= output.data[i].snapshotAt,
      );
    }
  }
  for (const snapshot of output.data) {
    TestValidator.predicate(
      "snapshot id should be present",
      snapshot.id.length > 0,
    );
    TestValidator.predicate(
      "snapshot reason should be present",
      snapshot.snapshotReason.length > 0,
    );
    TestValidator.predicate(
      "snapshot should preserve product name",
      snapshot.productName.length > 0,
    );
    TestValidator.predicate(
      "snapshot should preserve product description",
      snapshot.productDescription.length > 0,
    );
    TestValidator.predicate(
      "snapshot should preserve product sku",
      snapshot.productSku.length > 0,
    );
    TestValidator.predicate(
      "snapshot should preserve variant sku code",
      snapshot.variantSkuCode.length > 0,
    );
    TestValidator.predicate(
      "snapshot should preserve seller shop name",
      snapshot.sellerShopName.length > 0,
    );
    TestValidator.predicate(
      "snapshot should preserve seller shop description",
      snapshot.sellerShopDescription.length > 0,
    );
    TestValidator.predicate(
      "snapshot quantity should be positive",
      snapshot.quantity > 0,
    );
    TestValidator.predicate(
      "snapshot line total should be non-negative",
      snapshot.lineTotal >= 0,
    );
    TestValidator.predicate(
      "snapshot timestamps should be present",
      snapshot.snapshotAt.length > 0 &&
        snapshot.createdAt.length > 0 &&
        snapshot.updatedAt.length > 0,
    );
    TestValidator.equals(
      "snapshot order item should reference the requested item when present",
      snapshot.orderItem.id,
      snapshot.orderItem.id,
    );
  }
}
