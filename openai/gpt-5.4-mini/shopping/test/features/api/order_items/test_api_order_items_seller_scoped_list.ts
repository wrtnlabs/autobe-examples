import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_order_items_seller_scoped_list(
  connection: api.IConnection,
): Promise<void> {
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerAAuth = await authorize_seller_join(sellerAConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerAAuth);
  const sellerBAuth = await authorize_seller_join(sellerBConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerBAuth);
  const sellerAOrderItems =
    await api.functional.mallPlatform.seller.orderItems.index(
      sellerAConnection,
      {
        body: {
          mallPlatformSellerId: sellerAAuth.id,
          page: 1,
          limit: 10,
          sort: "created_at",
          direction: "desc",
        } satisfies IMallPlatformOrderItem.IRequest,
      },
    );
  typia.assert(sellerAOrderItems);
  TestValidator.predicate(
    "seller A response is scoped to seller A",
    sellerAOrderItems.data.every((item) => item.seller.id === sellerAAuth.id),
  );
  TestValidator.predicate(
    "seller A response excludes seller B items",
    sellerAOrderItems.data.every((item) => item.seller.id !== sellerBAuth.id),
  );
  TestValidator.predicate(
    "seller A response keeps seller-specific item status data",
    sellerAOrderItems.data.every((item) => item.status.length > 0),
  );
  for (const item of sellerAOrderItems.data) {
    typia.assert(item);
    TestValidator.equals(
      "item seller id matches filter",
      item.seller.id,
      sellerAAuth.id,
    );
    TestValidator.equals(
      "nested seller summary matches list scope",
      item.seller.id,
      sellerAAuth.id,
    );
    TestValidator.predicate(
      "nested order summary exists",
      item.order.id.length > 0 && item.order.orderNumber.length > 0,
    );
    TestValidator.predicate(
      "nested variant summary exists",
      item.productVariant.id.length > 0 &&
        item.productVariant.skuCode.length > 0,
    );
  }
  TestValidator.equals(
    "seller A pagination current page",
    sellerAOrderItems.pagination.current,
    1,
  );
  TestValidator.equals(
    "seller A pagination limit",
    sellerAOrderItems.pagination.limit,
    10,
  );
}
