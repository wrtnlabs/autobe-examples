import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_order_items_listing_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  //----
  // 1. Prepare seller
  //----
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(seller);
  //----
  // 2. Call default listing (no filters)
  //----
  const page1: IPageIECommerceMallOrderItem.ISummary =
    await api.functional.eCommerceMall.seller.order_items.index(
      sellerConnection,
      {
        body: {},
      },
    );
  typia.assert(page1);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current >= 1",
    page1.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "pagination limit >= 1",
    page1.pagination.limit >= 1,
    true,
  );
  TestValidator.equals(
    "pagination records >= 0",
    page1.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages >= 0",
    page1.pagination.pages >= 0,
    true,
  );
  //----
  // 3. Validate each item
  //----
  for (const item of page1.data) {
    // Subtotal validation
    TestValidator.equals(
      "subtotal = quantity * unit_price",
      item.subtotal,
      item.quantity * item.unit_price,
    );
    // Shop name should match seller's shop
    TestValidator.equals(
      "shop_name matches seller",
      item.shop_name,
      seller.profile!.shopName,
    );
    // Required fields presence via full type assertion
    typia.assert(item);
  }
  //----
  // 4. Test pagination with limit=2
  //----
  const pageLimited: IPageIECommerceMallOrderItem.ISummary =
    await api.functional.eCommerceMall.seller.order_items.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 2,
        },
      },
    );
  typia.assert(pageLimited);
  TestValidator.equals("limited page limit", pageLimited.pagination.limit, 2);
  TestValidator.predicate(
    "limited page data length <= 2",
    () => pageLimited.data.length <= 2,
  );
  // If there are more records, test page 2
  if (pageLimited.pagination.records > 2) {
    const page2: IPageIECommerceMallOrderItem.ISummary =
      await api.functional.eCommerceMall.seller.order_items.index(
        sellerConnection,
        {
          body: {
            page: 2,
            limit: 2,
          },
        },
      );
    typia.assert(page2);
    // Verify non-overlapping items
    const page1Ids = new Set(pageLimited.data.map((item) => item.id));
    const page2Ids = page2.data.map((item) => item.id);
    TestValidator.predicate("page 2 items are different from page 1", () =>
      page2Ids.every((id) => !page1Ids.has(id)),
    );
  }
  //----
  // 5. Test empty result with date filter
  //----
  const emptyResult: IPageIECommerceMallOrderItem.ISummary =
    await api.functional.eCommerceMall.seller.order_items.index(
      sellerConnection,
      {
        body: {
          createdAtFrom: "2000-01-01T00:00:00.000Z",
          createdAtTo: "2000-01-02T00:00:00.000Z",
        } satisfies IECommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals("empty result data count", emptyResult.data.length, 0);
  TestValidator.equals(
    "empty result records count",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result pages count",
    emptyResult.pagination.pages,
    0,
  );
}
