import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_carts_index_availability_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        href: "https://shop.example.com/join",
        referrer: "https://google.com",
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customer);
  // 2. Create test products and variants with different stock levels
  const productIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const products = ArrayUtil.repeat(3, (i) => ({
    id: productIds[i],
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<100>
    >(),
    is_active: true,
  }));
  const variants: {
    productId: string;
    variant: IEcommerceMallProductVariant.ISummary;
    cartQuantity: number;
  }[] = [
    {
      productId: productIds[0],
      variant: {
        id: typia.random<string & tags.Format<"uuid">>(),
        skuCode: RandomGenerator.alphaNumeric(10),
        product: {
          id: productIds[0],
          name: products[0].name,
          description: products[0].description,
          base_price: products[0].base_price,
          is_active: products[0].is_active,
          created_at: new Date().toISOString(),
          seller: {
            id: typia.random<string & tags.Format<"uuid">>(),
            email: typia.random<string & tags.Format<"email">>(),
            approval_status: "approved",
            is_suspended: false,
            is_banned: false,
            created_at: new Date().toISOString(),
          } as IEcommerceMallProductVariant.ISummary["product"]["seller"],
          category: {
            id: typia.random<string & tags.Format<"uuid">>(),
            name: RandomGenerator.name(2),
            is_leaf: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
          } as IEcommerceMallProductVariant.ISummary["product"]["category"],
        },
        stockQuantity: 10,
        isActive: true,
        priceOverride: null,
        displayPrice: 100,
      },
      cartQuantity: 2,
    },
    {
      productId: productIds[1],
      variant: {
        id: typia.random<string & tags.Format<"uuid">>(),
        skuCode: RandomGenerator.alphaNumeric(10),
        product: {
          id: productIds[1],
          name: products[1].name,
          description: products[1].description,
          base_price: products[1].base_price,
          is_active: products[1].is_active,
          created_at: new Date().toISOString(),
          seller: {
            id: typia.random<string & tags.Format<"uuid">>(),
            email: typia.random<string & tags.Format<"email">>(),
            approval_status: "approved",
            is_suspended: false,
            is_banned: false,
            created_at: new Date().toISOString(),
          } as IEcommerceMallProductVariant.ISummary["product"]["seller"],
          category: {
            id: typia.random<string & tags.Format<"uuid">>(),
            name: RandomGenerator.name(2),
            is_leaf: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
          } as IEcommerceMallProductVariant.ISummary["product"]["category"],
        },
        stockQuantity: 3,
        isActive: true,
        priceOverride: null,
        displayPrice: 200,
      },
      cartQuantity: 5,
    },
    {
      productId: productIds[2],
      variant: {
        id: typia.random<string & tags.Format<"uuid">>(),
        skuCode: RandomGenerator.alphaNumeric(10),
        product: {
          id: productIds[2],
          name: products[2].name,
          description: products[2].description,
          base_price: products[2].base_price,
          is_active: products[2].is_active,
          created_at: new Date().toISOString(),
          seller: {
            id: typia.random<string & tags.Format<"uuid">>(),
            email: typia.random<string & tags.Format<"email">>(),
            approval_status: "approved",
            is_suspended: false,
            is_banned: false,
            created_at: new Date().toISOString(),
          } as IEcommerceMallProductVariant.ISummary["product"]["seller"],
          category: {
            id: typia.random<string & tags.Format<"uuid">>(),
            name: RandomGenerator.name(2),
            is_leaf: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
          } as IEcommerceMallProductVariant.ISummary["product"]["category"],
        },
        stockQuantity: 0,
        isActive: true,
        priceOverride: null,
        displayPrice: 300,
      },
      cartQuantity: 1,
    },
  ];
  // Add cart items for each variant
  const cartItems = ArrayUtil.repeat(3, async (index) => {
    const variant = variants[index];
    const cartItem: IEcommerceMallCartItem.ISummary = {
      id: typia.random<string & tags.Format<"uuid">>(),
      quantity: variant.cartQuantity,
      price: variant.variant.displayPrice,
      variant: variant.variant,
      availability:
        variant.variant.stockQuantity >= variant.cartQuantity
          ? "available"
          : variant.variant.stockQuantity > 0 &&
              variant.variant.stockQuantity < variant.cartQuantity
            ? "low_stock"
            : "out_of_stock",
    };
    return cartItem;
  });
  const resolvedCartItems = await Promise.all(cartItems);
  // 3. Test availability filters
  // Test 'available' filter
  const availableFilterRequest: IEcommerceMallCartItem.IRequest = {
    availability: "available",
  } satisfies IEcommerceMallCartItem.IRequest;
  const availableResult =
    await api.functional.ecommerceMall.customer.carts.index(
      customerConnection,
      { body: availableFilterRequest },
    );
  typia.assert(availableResult);
  TestValidator.equals(
    "available filter returns only available items",
    availableResult.data.length,
    1,
  );
  TestValidator.equals(
    "available item has correct status",
    availableResult.data[0].availability,
    "available",
  );
  // Test 'low_stock' filter
  const lowStockFilterRequest: IEcommerceMallCartItem.IRequest = {
    availability: "low_stock",
  } satisfies IEcommerceMallCartItem.IRequest;
  const lowStockResult =
    await api.functional.ecommerceMall.customer.carts.index(
      customerConnection,
      { body: lowStockFilterRequest },
    );
  typia.assert(lowStockResult);
  TestValidator.equals(
    "low_stock filter returns only low stock items",
    lowStockResult.data.length,
    1,
  );
  TestValidator.equals(
    "low_stock item has correct status",
    lowStockResult.data[0].availability,
    "low_stock",
  );
  // Test 'out_of_stock' filter
  const outOfStockFilterRequest: IEcommerceMallCartItem.IRequest = {
    availability: "out_of_stock",
  } satisfies IEcommerceMallCartItem.IRequest;
  const outOfStockResult =
    await api.functional.ecommerceMall.customer.carts.index(
      customerConnection,
      { body: outOfStockFilterRequest },
    );
  typia.assert(outOfStockResult);
  TestValidator.equals(
    "out_of_stock filter returns only out of stock items",
    outOfStockResult.data.length,
    1,
  );
  TestValidator.equals(
    "out_of_stock item has correct status",
    outOfStockResult.data[0].availability,
    "out_of_stock",
  );
  // Test no filter (should return all items)
  const noFilterRequest: IEcommerceMallCartItem.IRequest = {};
  const noFilterResult =
    await api.functional.ecommerceMall.customer.carts.index(
      customerConnection,
      { body: noFilterRequest },
    );
  typia.assert(noFilterResult);
  TestValidator.equals(
    "no filter returns all items",
    noFilterResult.data.length,
    3,
  );
  // Validate each item's availability matches expected calculation
  for (const item of noFilterResult.data) {
    const variant = item.variant;
    const expectedAvailability =
      variant.stockQuantity >= item.quantity
        ? "available"
        : variant.stockQuantity > 0 && variant.stockQuantity < item.quantity
          ? "low_stock"
          : "out_of_stock";
    TestValidator.equals(
      `item ${item.id} availability correct`,
      item.availability,
      expectedAvailability,
    );
  }
}
