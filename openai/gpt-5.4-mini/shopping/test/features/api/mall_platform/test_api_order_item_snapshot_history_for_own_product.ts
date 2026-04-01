import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
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

export async function test_api_order_item_snapshot_history_for_own_product(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/seller/register",
      referrer: "https://example.com/",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const request: IMallPlatformOrderItemSnapshot.IRequest = {
    search: RandomGenerator.alphabets(5),
    orderItemStatus: RandomGenerator.alphabets(6),
    productName: RandomGenerator.name(),
    productSku: RandomGenerator.alphabets(8),
    variantSkuCode: RandomGenerator.alphabets(10),
    sellerShopName: RandomGenerator.name(),
    snapshotReason: RandomGenerator.paragraph({ sentences: 1 }),
    snapshotAtFrom: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    snapshotAtTo: new Date().toISOString(),
    createdAtFrom: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    createdAtTo: new Date().toISOString(),
    unitPriceMin: 0,
    unitPriceMax: 100000,
    quantityMin: 1,
    quantityMax: 10,
    lineTotalMin: 0,
    lineTotalMax: 1000000,
    page: 1,
    limit: 10,
    sort: "-snapshotAt",
  };
  const output =
    await api.functional.mallPlatform.seller.order_items.snapshots.index(
      sellerConnection,
      {
        orderItemId,
        body: request,
      },
    );
  typia.assert(output);
  TestValidator.predicate(
    "pagination current is positive",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    output.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data array is within page limit",
    output.data.length <= output.pagination.limit,
  );
  if (output.data.length > 1) {
    TestValidator.predicate("snapshots sorted newest first", () => {
      for (let i: number = 1; i < output.data.length; i++) {
        if (output.data[i - 1].snapshotAt < output.data[i].snapshotAt)
          return false;
      }
      return true;
    });
  }
  for (const snapshot of output.data) {
    TestValidator.predicate("snapshot id is present", snapshot.id.length > 0);
    TestValidator.predicate(
      "snapshot reason is preserved",
      snapshot.snapshotReason.length > 0,
    );
    TestValidator.predicate(
      "product name is preserved",
      snapshot.productName.length > 0,
    );
    TestValidator.predicate(
      "product description is preserved",
      snapshot.productDescription.length > 0,
    );
    TestValidator.predicate(
      "product sku is preserved",
      snapshot.productSku.length > 0,
    );
    TestValidator.predicate(
      "variant sku code is preserved",
      snapshot.variantSkuCode.length > 0,
    );
    TestValidator.predicate(
      "seller shop name is preserved",
      snapshot.sellerShopName.length > 0,
    );
    TestValidator.predicate(
      "seller shop description is preserved",
      snapshot.sellerShopDescription.length > 0,
    );
    TestValidator.predicate(
      "seller logo image url is preserved",
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
    TestValidator.predicate("createdAt is set", snapshot.createdAt.length > 0);
    TestValidator.predicate("updatedAt is set", snapshot.updatedAt.length > 0);
  }
  const filtered =
    await api.functional.mallPlatform.seller.order_items.snapshots.index(
      sellerConnection,
      {
        orderItemId,
        body: {
          search: request.search,
          orderItemStatus: request.orderItemStatus,
          productName: request.productName,
          productSku: request.productSku,
          variantSkuCode: request.variantSkuCode,
          sellerShopName: request.sellerShopName,
          snapshotReason: request.snapshotReason,
          snapshotAtFrom: request.snapshotAtFrom,
          snapshotAtTo: request.snapshotAtTo,
          createdAtFrom: request.createdAtFrom,
          createdAtTo: request.createdAtTo,
          unitPriceMin: request.unitPriceMin,
          unitPriceMax: request.unitPriceMax,
          quantityMin: request.quantityMin,
          quantityMax: request.quantityMax,
          lineTotalMin: request.lineTotalMin,
          lineTotalMax: request.lineTotalMax,
          page: 1,
          limit: 5,
          sort: "-snapshotAt",
        } satisfies IMallPlatformOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(filtered);
  TestValidator.predicate(
    "filtered response remains paginated",
    filtered.pagination.current >= 1,
  );
  TestValidator.predicate(
    "filtered response remains scoped to one page size",
    filtered.data.length <= filtered.pagination.limit,
  );
}
