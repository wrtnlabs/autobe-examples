import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_customers_me_wishlist_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_wishlist_create";
import { prepare_random_ecommerce_mall_wishlist_item } from "../../../prepare/prepare_random_ecommerce_mall_wishlist_item";

export async function test_api_wishlist_search_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Product names for testing search
  const productNames = [
    "Wireless Mouse",
    "Gaming Keyboard",
    "USB Cable",
    "Monitor Stand",
    "Webcam",
  ];
  // 2. Add products to wishlist using the utility function
  const wishlistItems = await ArrayUtil.asyncMap(productNames, async (name: string) => {
    // Add product to wishlist using the utility function
    const wishlistItem =
      await generate_random_ecommerce_mall_customer_customers_me_wishlist_create(
        customerConnection,
        {
          body: {
            productId: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    return wishlistItem;
  });
  // 3. Test search with 'mouse' - should return only 'Wireless Mouse'
  const mouseSearchResult =
    await api.functional.ecommerceMall.customer.wishlist.index(
      customerConnection,
      {
        body: {
          search: "mouse",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallWishlistItem.IRequest,
      },
    );
  typia.assert(mouseSearchResult);
  TestValidator.equals(
    "search 'mouse' returns 1 item",
    mouseSearchResult.data.length,
    1,
  );
  TestValidator.equals(
    "search 'mouse' total is 1",
    mouseSearchResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "search 'mouse' matches 'Wireless Mouse'",
    mouseSearchResult.data[0]!.product.name,
    "Wireless Mouse",
  );
  // 4. Test search with 'keyboard' - should return only 'Gaming Keyboard'
  const keyboardSearchResult =
    await api.functional.ecommerceMall.customer.wishlist.index(
      customerConnection,
      {
        body: {
          search: "keyboard",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallWishlistItem.IRequest,
      },
    );
  typia.assert(keyboardSearchResult);
  TestValidator.equals(
    "search 'keyboard' returns 1 item",
    keyboardSearchResult.data.length,
    1,
  );
  TestValidator.equals(
    "search 'keyboard' total is 1",
    keyboardSearchResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "search 'keyboard' matches 'Gaming Keyboard'",
    keyboardSearchResult.data[0]!.product.name,
    "Gaming Keyboard",
  );
  // 5. Test search with 'usb' - should return only 'USB Cable'
  const usbSearchResult =
    await api.functional.ecommerceMall.customer.wishlist.index(
      customerConnection,
      {
        body: {
          search: "usb",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallWishlistItem.IRequest,
      },
    );
  typia.assert(usbSearchResult);
  TestValidator.equals(
    "search 'usb' returns 1 item",
    usbSearchResult.data.length,
    1,
  );
  TestValidator.equals(
    "search 'usb' total is 1",
    usbSearchResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "search 'usb' matches 'USB Cable'",
    usbSearchResult.data[0]!.product.name,
    "USB Cable",
  );
  // 6. Test case-insensitive matching
  const caseVariants = ["MOUSE", "Mouse", "mouse"] as const;
  for (const variant of caseVariants) {
    const caseResult =
      await api.functional.ecommerceMall.customer.wishlist.index(
        customerConnection,
        {
          body: {
            search: variant,
            page: 1,
            limit: 20,
          } satisfies IEcommerceMallWishlistItem.IRequest,
        },
      );
    typia.assert(caseResult);
    TestValidator.equals(
      `search '${variant}' returns 1 item`,
      caseResult.data.length,
      1,
    );
    TestValidator.equals(
      `search '${variant}' total is 1`,
      caseResult.pagination.records,
      1,
    );
    TestValidator.equals(
      `search '${variant}' matches 'Wireless Mouse'`,
      caseResult.data[0]!.product.name,
      "Wireless Mouse",
    );
  }
  // 7. Verify no matches for non-existent products
  const noMatchResult =
    await api.functional.ecommerceMall.customer.wishlist.index(
      customerConnection,
      {
        body: {
          search: "nonexistentproduct123",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallWishlistItem.IRequest,
      },
    );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "search non-existent returns 0 items",
    noMatchResult.data.length,
    0,
  );
  TestValidator.equals(
    "search non-existent total is 0",
    noMatchResult.pagination.records,
    0,
  );
}