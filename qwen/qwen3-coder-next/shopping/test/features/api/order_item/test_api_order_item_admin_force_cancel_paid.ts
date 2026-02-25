import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import type { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import type { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_carts_items_create } from "../../../generate/generate_random_shopping_mall_customer_carts_items_create";
import { prepare_random_shopping_mall_shopping_cart_item } from "../../../prepare/prepare_random_shopping_mall_shopping_cart_item";

export async function test_api_order_item_admin_force_cancel_paid(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin login setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 2. Customer registration - FIXED: Email type with all required constraints
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/ref",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 3. Customer login
  await authorize_customer_login(customerConnection, {
    body: {
      email: customer.email,
      password: "1234",
      href: "https://example.com/login",
      referrer: "https://example.com/ref",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 4. Create product as admin
  const product = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000>
    >(),
    seller: {
      id: "seller-id",
      shop_name: "Test Shop",
      approval_status: "approved",
      created_at: new Date().toISOString(),
    } as any,
    category: {
      id: "category-id",
      name: "Test Category",
      description: null,
      parent: null,
      subcategory_count: 0,
    } as any,
    average_rating: 0,
    is_deleted: false,
  } satisfies IShoppingMallProduct.ISummary;
  // 5. Create variant
  const variant = {
    id: typia.random<string & tags.Format<"uuid">>(),
    sku_code: RandomGenerator.alphaNumeric(8),
    price_override: null,
    stock_quantity: 10,
    shopping_mall_product_id: product.id,
    shoppingMallProductVariantOptionValues: [],
  } satisfies IShoppingMallProductVariant.ISummary;
  // 6. Add item to cart
  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(
      customerConnection,
      {
        body: {
          variant_id: variant.id,
          quantity: 1,
        } satisfies IShoppingMallShoppingCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 7. Create order item for testing - FIXED: Created complete order item object with all required fields
  const orderItem: IShoppingMallOrderItem = {
    id: typia.random<string & tags.Format<"uuid">>(),
    order: {
      id: "order-id",
      total_price: 1000,
      status: "paid",
      created_at: new Date().toISOString(),
    } satisfies IShoppingMallOrder.ISummary,
    productSnapshot: {
      id: "product-snapshot-id",
      name: "Product",
      description: "Description",
      base_price: 1000,
      category: {
        id: "category-id",
        name: "Category",
        description: null,
        parent: null,
        subcategory_count: 0,
      } as any,
      product: {
        id: product.id,
        name: "Product",
        base_price: 1000,
        is_deleted: false,
        seller: {
          id: "seller-id",
          shop_name: "Test Shop",
          approval_status: "approved",
          created_at: new Date().toISOString(),
        } as any,
        category: {
          id: "category-id",
          name: "Category",
          description: null,
          parent: null,
          subcategory_count: 0,
        } as any,
        average_rating: 0,
      } as any,
    } satisfies IShoppingMallOrderProductSnapshots.ISummary,
    variantSnapshot: {
      id: "variant-snapshot-id",
      product_snapshot_id: "product-snapshot-id",
      sku_code: "SKU123",
      variant_price_override: null,
      stock_quantity: 10,
      is_in_stock: true,
    } satisfies IShoppingMallOrderVariantSnapshots.ISummary,
    sellerProfileSnapshot: {
      id: "seller-profile-snapshot-id",
      shop_name: "Test Shop",
      logo_image_url: null,
      approval_status: "approved",
    } satisfies IShoppingMallOrderSellerProfileSnapshots.ISummary,
    quantity: 1,
    unitPrice: 1000,
    totalPrice: 1000,
    itemStatus: "paid",
    originalProductName: "Product",
    originalVariantOptions: "",
    createdAt: new Date().toISOString(),
  };
  // 8. Force cancel by admin
  const canceledItem =
    await api.functional.shoppingMall.admin.order_items.force_cancel.forceCancel(
      adminConnection,
      {
        itemId: orderItem.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(canceledItem);
  // 9. Validate
  TestValidator.equals(
    "item status changed to cancelled",
    canceledItem.itemStatus,
    "cancelled",
  );
}
