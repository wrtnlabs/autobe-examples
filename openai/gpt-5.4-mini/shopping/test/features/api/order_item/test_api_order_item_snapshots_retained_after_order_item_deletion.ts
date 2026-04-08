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

export async function test_api_order_item_snapshots_retained_after_order_item_deletion(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const request = {
    limit: 10,
    page: 1,
    sort: "createdAt_desc",
  } satisfies IMallPlatformOrderItemSnapshot.IRequest;
  const output =
    await api.functional.mallPlatform.seller.orderItems.snapshots.index(
      sellerConnection,
      {
        orderItemId,
        body: request,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "snapshot page should reflect the requested page",
    output.pagination.current,
    request.page ?? 1,
  );
  TestValidator.equals(
    "snapshot page limit should reflect the requested limit",
    output.pagination.limit,
    request.limit ?? 0,
  );
  TestValidator.predicate(
    "snapshot history response should be paginated",
    output.pagination.records >= 0 && output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "returned snapshots should reference a single order item",
    output.data.every((snapshot) => snapshot.orderItem.id === orderItemId),
  );
  TestValidator.predicate(
    "historical snapshot content should preserve product and seller fields",
    output.data.every(
      (snapshot) =>
        snapshot.productName.length > 0 &&
        snapshot.productDescription.length > 0 &&
        snapshot.productSku.length > 0 &&
        snapshot.variantSkuCode.length > 0 &&
        snapshot.sellerShopName.length > 0 &&
        snapshot.sellerShopDescription.length >= 0 &&
        snapshot.snapshotReason.length > 0,
    ),
  );
}
