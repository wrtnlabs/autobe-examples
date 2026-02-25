import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";
import { prepare_random_ecommerce_cart_item } from "../../../prepare/prepare_random_ecommerce_cart_item";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_seller_products_variants_create";
import { generate_random_ecommerce_customer_carts_create } from "../../../generate/generate_random_ecommerce_customer_carts_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_cart_stock_edge_case(connection: api.IConnection): Promise<void> {
    /* Scenario: A customer adds a quantity of product variant that exactly matches the remaining inventory.
     * Steps:
     * 1. Create seller to prepare product
     * 2. Create product as seller
     * 3. Create product variant for product
     * 4. Create customer account
     * 5. Login as customer
     * 6. Add product variant to cart with quantity of 1 (matching expected inventory of 1)
     */
    // 1. Create seller to prepare product
    const sellerConnection: api.IConnection = { host: connection.host };
    const sellerAuth = await authorize_seller_join(sellerConnection, {});
    typia.assert(sellerAuth);
    
    // 2. Create product as seller
    const product = await generate_random_ecommerce_seller_products_create(sellerConnection, {});
    typia.assert(product);
    
    // 3. Create product variant for product
    const variant = await generate_random_ecommerce_seller_products_variants_create(sellerConnection, {
        body: {
            sku_code: RandomGenerator.alphabets(6),
            price: typia.random<number & tags.Minimum<0.01>>(),
        },
        params: {
            productId: product.id,
        },
    });
    typia.assert(variant);
    
    // 4. Create customer account
    const customerConnection: api.IConnection = { host: connection.host };
    const customerAuth = await authorize_customer_join(customerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: "https://example.com",
            referrer: "https://example.com",
            ip: typia.random<string & tags.Format<"ipv4">>(),
        },
    });
    typia.assert(customerAuth);
    
    // Set authorization header for customer connection
    customerConnection.headers = {
        Authorization: `Bearer ${customerAuth.token.access}`,
    };
    
    // 5. Add product variant to cart with quantity of 1 (matching inventory limit of 1)
    const cartItem = await generate_random_ecommerce_customer_carts_create(customerConnection, {
        body: {
            product_variant_id: variant.id,
            quantity: 1,
        },
    });
    typia.assert(cartItem);
    
    // Validations
    TestValidator.equals("Cart item has correct variant", cartItem.variant.id, variant.id);
    TestValidator.equals("Cart item has correct quantity", cartItem.quantity, 1);
}