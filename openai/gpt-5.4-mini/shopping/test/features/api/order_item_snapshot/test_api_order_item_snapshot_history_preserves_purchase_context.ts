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

export async function test_api_order_item_snapshot_history_preserves_purchase_context(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!@#$",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const request: IMallPlatformOrderItemSnapshot.IRequest = {
    page: 1,
    limit: 10,
    sort: "-snapshotAt",
  };
  const page =
    await api.functional.mallPlatform.seller.order_items.snapshots.index(
      sellerConnection,
      {
        orderItemId,
        body: request,
      },
    );
  typia.assert(page);
  TestValidator.equals("requested page", page.pagination.current, 1);
  TestValidator.equals("requested limit", page.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length bounded by limit",
    page.data.length <= page.pagination.limit,
  );
  for (let i = 1; i < page.data.length; ++i) {
    TestValidator.predicate(
      "snapshots ordered by time descending",
      page.data[i - 1].snapshotAt >= page.data[i].snapshotAt,
    );
  }
  if (page.data.length > 0) {
    for (const snapshot of page.data) {
      TestValidator.predicate("snapshot has id", snapshot.id.length > 0);
      TestValidator.predicate(
        "snapshot reason preserved",
        snapshot.snapshotReason.length > 0,
      );
      TestValidator.predicate(
        "order item status preserved",
        snapshot.orderItemStatus.length > 0,
      );
      TestValidator.predicate(
        "product name preserved",
        snapshot.productName.length > 0,
      );
      TestValidator.predicate(
        "product description preserved",
        snapshot.productDescription.length > 0,
      );
      TestValidator.predicate(
        "product sku preserved",
        snapshot.productSku.length > 0,
      );
      TestValidator.predicate(
        "variant sku preserved",
        snapshot.variantSkuCode.length > 0,
      );
      TestValidator.predicate(
        "seller shop name preserved",
        snapshot.sellerShopName.length > 0,
      );
      TestValidator.predicate(
        "seller shop description preserved",
        snapshot.sellerShopDescription.length > 0,
      );
      TestValidator.predicate(
        "seller logo preserved",
        snapshot.sellerLogoImageUrl.length > 0,
      );
      TestValidator.predicate("unit price preserved", snapshot.unitPrice >= 0);
      TestValidator.predicate("quantity preserved", snapshot.quantity >= 0);
      TestValidator.predicate("line total preserved", snapshot.lineTotal >= 0);
      TestValidator.predicate(
        "created at present",
        snapshot.createdAt.length > 0,
      );
      TestValidator.predicate(
        "updated at present",
        snapshot.updatedAt.length > 0,
      );
    }
    if (page.pagination.pages > 1) {
      const lastPage =
        await api.functional.mallPlatform.seller.order_items.snapshots.index(
          sellerConnection,
          {
            orderItemId,
            body: {
              ...request,
              page: page.pagination.pages,
            },
          },
        );
      typia.assert(lastPage);
      TestValidator.predicate(
        "last page bounded by limit",
        lastPage.data.length <= request.limit!,
      );
    }
  }
}
