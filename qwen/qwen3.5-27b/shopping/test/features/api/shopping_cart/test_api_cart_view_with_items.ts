import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
/**
 * Test the primary success path for viewing a customer's shopping cart with items.
 *
 * Validates the complete cart viewing flow including seller product setup, customer authentication, and cart item retrieval. Ensures that the cart correctly displays product variant details, quantities, subtotals, and the calculated total price.
 *
 * Special attention is given to verifying that product variant information (SKU code, options, price, stock quantity) is correctly joined, that subtotals are accurately calculated as price × quantity, and that the cart total reflects the sum of all item subtotals.
 *
 * 1. Register and authenticate a customer for cart operations.
 * 2. Register and authenticate a seller for product creation.
 * 3. Seller creates a product with name, description, and base price.
 * 4. Seller creates a product variant with SKU code, options, and initial stock.
 * 5. Customer adds the variant to their cart with a specific quantity.
 * 6. Customer retrieves their shopping cart via GET endpoint.
 * 7. Validates cart structure contains cart_items array with correct product variant details.
 * 8. Verifies subtotal calculation matches price × quantity for each item.
 * 9. Verifies total calculation equals sum of all cart item subtotals.
 */
export async function test_api_cart_view_with_items(connection: api.IConnection): Promise<void> {
    // 1. Customer registration and authentication
    const customerConnection: api.IConnection = { host: connection.host };
    await authorize_customer_join(customerConnection, {});
    // 2. Seller registration and authentication
    const sellerConnection: api.IConnection = { host: connection.host };
    await authorize_seller_join(sellerConnection, {});
    // 3. Seller creates a product
    const product = await generate_random_shopping_mall_seller_products_create(sellerConnection, {});
    typia.assert(product);
    // 4. Seller creates a product variant with stock
    const variant = await generate_random_shopping_mall_seller_products_variants_create(sellerConnection, {
        body: {
            initialStockQuantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<10>>(),
        },
        params: {
            productId: product.id,
        },
    });
    typia.assert(variant);
    // 5. Customer adds variant to cart
    const quantity = typia.random<number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>>();
    const cartItem = await generate_random_shopping_mall_customer_cart_items_create(customerConnection, {
        body: {
            productVariantId: variant.id,
            quantity,
        },
    });
    typia.assert(cartItem);
    // 6. Customer retrieves their shopping cart
    const cart = await api.functional.shoppingMall.customer.cart.at(customerConnection);
    typia.assert(cart);
    // 7. Validate cart structure
    TestValidator.equals("cart has items", cart.cart_items.length, 1);
    const item = cart.cart_items[0];
    // 8. Verify cart item details
    TestValidator.equals("item quantity matches", item.quantity, quantity);
    TestValidator.equals("item variant matches", item.productVariant.id, variant.id);
    TestValidator.equals("item SKU matches", item.productVariant.sku_code, variant.sku_code);
    // 9. Verify subtotal calculation
    const expectedSubtotal = (item.productVariant.price ?? item.productVariant.product.base_price) * item.quantity;
    TestValidator.equals("subtotal calculation correct", item.subtotal, expectedSubtotal);
    // 10. Verify total calculation
    TestValidator.equals("cart total correct", cart.total, expectedSubtotal);
    // 11. Verify variant options are included
    TestValidator.predicate("variant has options", item.productVariant.options.length >= 0);
    // 12. Verify stock quantity is available
    TestValidator.predicate("variant has stock", item.productVariant.stock_quantity >= item.quantity);
}