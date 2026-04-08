import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cart_items_listing_with_availability_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  // 2. Add first cart item with sufficient stock
  // Using variant with sufficient inventory for testing lineSubtotal and availability
  const variantId1 = typia.random<string & tags.Format<"uuid">>();
  const cartItem1Quantity = 2;
  const firstCartItem =
    await api.functional.ecommerceMall.customer.ecommerceMall.cart.items.create(
      customerConnection,
      {
        body: {
          variantId: variantId1,
          quantity: cartItem1Quantity,
        } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(firstCartItem);
  // 3. Add second cart item with quantity exceeding stock
  // Using another variant to test stockWarning and out_of_stock status
  const variantId2 = typia.random<string & tags.Format<"uuid">>();
  const cartItem2Quantity = 10;
  const secondCartItem =
    await api.functional.ecommerceMall.customer.ecommerceMall.cart.items.create(
      customerConnection,
      {
        body: {
          variantId: variantId2,
          quantity: cartItem2Quantity,
        } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(secondCartItem);
  // 4. List cart items with PATCH /ecommerceMall/customer/cart/items
  const cartItemsResponse =
    await api.functional.ecommerceMall.customer.cart.items.index(
      customerConnection,
      {
        body: {
          stockStatus: "all",
        } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(cartItemsResponse);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination exists",
    cartItemsResponse.pagination !== undefined,
    true,
  );
  // 6. Validate cart items data
  TestValidator.predicate("has cart items", cartItemsResponse.data.length >= 2);
  // 7. Validate first cart item has required fields
  const item1 = cartItemsResponse.data.find((i) => i.id === firstCartItem.id);
  TestValidator.equals("first cart item found", item1 !== undefined, true);
  if (item1) {
    TestValidator.predicate(
      "id is valid uuid",
      /^[0-9a-f-]{36}$/i.test(item1.id),
    );
    TestValidator.equals("quantity matches", item1.quantity, cartItem1Quantity);
    TestValidator.predicate("createdAt is valid datetime", !!item1.createdAt);
    TestValidator.predicate("updatedAt is valid datetime", !!item1.updatedAt);
    // Validate joined data
    TestValidator.predicate("productName exists", !!item1.productName);
    TestValidator.predicate("variantSkuCode exists", !!item1.variantSkuCode);
    // Validate variant object
    TestValidator.equals("variant exists", item1.variant !== undefined, true);
    if (item1.variant) {
      TestValidator.predicate(
        "variant id is valid uuid",
        /^[0-9a-f-]{36}$/i.test(item1.variant.id),
      );
      TestValidator.predicate(
        "variant sku_code exists",
        !!item1.variant.sku_code,
      );
      TestValidator.predicate(
        "variant has optionValues array",
        Array.isArray(item1.variant.optionValues),
      );
    }
    // Validate availabilityStatus for item with sufficient stock
    TestValidator.equals(
      "availabilityStatus is available",
      item1.availabilityStatus,
      "available",
    );
    TestValidator.equals(
      "stockWarning is false for sufficient stock",
      item1.stockWarning,
      false,
    );
  }
  // 8. Validate second cart item with stock shortage
  const item2 = cartItemsResponse.data.find((i) => i.id === secondCartItem.id);
  TestValidator.equals("second cart item found", item2 !== undefined, true);
  if (item2) {
    TestValidator.equals("quantity matches", item2.quantity, cartItem2Quantity);
    TestValidator.predicate("createdAt is valid datetime", !!item2.createdAt);
    TestValidator.predicate("updatedAt is valid datetime", !!item2.updatedAt);
    // Validate stockWarning for item with stock shortage
    TestValidator.equals(
      "stockWarning is true for shortage",
      item2.stockWarning,
      true,
    );
    TestValidator.predicate(
      "stockShortageAmount exists when warning",
      item2.stockShortageAmount !== undefined,
    );
    if (item2.stockShortageAmount !== undefined) {
      TestValidator.predicate(
        "stockShortageAmount is positive",
        item2.stockShortageAmount > 0,
      );
    }
    // Validate availabilityStatus for item with insufficient stock
    TestValidator.equals(
      "availabilityStatus is out_of_stock",
      item2.availabilityStatus,
      "out_of_stock",
    );
  }
  // 9. Validate lineSubtotal calculation
  if (item1 && item1.variant) {
    const expectedLineSubtotal = (item1.variant.price ?? 0) * item1.quantity;
    TestValidator.equals(
      "lineSubtotal calculated correctly",
      item1.lineSubtotal,
      expectedLineSubtotal,
    );
  }
  if (item2 && item2.variant) {
    const expectedLineSubtotal = (item2.variant.price ?? 0) * item2.quantity;
    TestValidator.equals(
      "lineSubtotal calculated correctly",
      item2.lineSubtotal,
      expectedLineSubtotal,
    );
  }
  // 10. Validate sorting by created_at descending
  for (let i = 1; i < cartItemsResponse.data.length; i++) {
    const prev = new Date(cartItemsResponse.data[i - 1].createdAt).getTime();
    const curr = new Date(cartItemsResponse.data[i].createdAt).getTime();
    TestValidator.predicate("sorted by createdAt descending", prev >= curr);
  }
}