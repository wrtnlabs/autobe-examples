import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
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

export async function test_api_seller_order_items_seller_scope_isolation(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validate seller-scoped order-item browsing isolation.
   *
   * This test authenticates two independent seller sessions and calls the
   * seller order-items browse endpoint from each session. It verifies that each
   * response is strictly scoped to the authenticated seller, that the returned
   * order items all belong to the caller, and that the nested seller summary in
   * each row matches the active seller context.
   *
   * 1. Create two separate seller sessions using the seller join utility.
   * 2. Browse order items from each seller context.
   * 3. Validate page shape, row ownership, and seller identity isolation.
   */
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerA);
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerB);
  const sellerAOrders =
    await api.functional.mallPlatform.seller.orderItems.index(
      sellerAConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IMallPlatformOrderItem.IRequest,
      },
    );
  typia.assert(sellerAOrders);
  const sellerBOrders =
    await api.functional.mallPlatform.seller.orderItems.index(
      sellerBConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IMallPlatformOrderItem.IRequest,
      },
    );
  typia.assert(sellerBOrders);
  TestValidator.predicate(
    "seller A page data should belong to seller A",
    sellerAOrders.data.every((item) => item.seller.id === sellerA.id),
  );
  TestValidator.predicate(
    "seller B page data should belong to seller B",
    sellerBOrders.data.every((item) => item.seller.id === sellerB.id),
  );
  TestValidator.predicate(
    "seller A page must not leak seller B items",
    sellerAOrders.data.every((item) => item.seller.id !== sellerB.id),
  );
  TestValidator.predicate(
    "seller B page must not leak seller A items",
    sellerBOrders.data.every((item) => item.seller.id !== sellerA.id),
  );
  for (const item of sellerAOrders.data) {
    TestValidator.equals(
      "seller A nested seller id",
      item.seller.id,
      sellerA.id,
    );
    TestValidator.equals(
      "seller A nested seller email",
      item.seller.email,
      sellerA.email,
    );
  }
  for (const item of sellerBOrders.data) {
    TestValidator.equals(
      "seller B nested seller id",
      item.seller.id,
      sellerB.id,
    );
    TestValidator.equals(
      "seller B nested seller email",
      item.seller.email,
      sellerB.email,
    );
  }
}
