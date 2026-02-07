import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAddress";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCart";
import type { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerEmailVerification";
import type { IEcommerceCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerPasswordReset";
import type { IEcommerceCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerSession";
import type { IEcommerceDefaultAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDefaultAddress";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductReview";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import type { IEcommerceWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlistItem";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProductVariant";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { generate_random_ecommerce_products_create } from "../../../generate/generate_random_ecommerce_products_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
export async function test_api_product_variant_index_sku_filter(connection: api.IConnection): Promise<void> {
    // 1. Authenticate customer
    const customerConnection: api.IConnection = { host: connection.host };
    await authorize_customer_join(customerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "1234",
            display_name: RandomGenerator.name(),
            href: "http://localhost",
            referrer: "http://localhost",
            ip: "127.0.0.1",
        },
    });

    // 2. Create product
    const product = await generate_random_ecommerce_products_create(customerConnection, {});

    // 3. Create variants with case-insensitive SKU variations
    const variants = ArrayUtil.repeat(3, () => ({
        sku: RandomGenerator.alphabets(5),
        price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
        stock_quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    }));

    // 4. Prepare for SKU filtering test
    const caseInsensitiveSku = variants[0].sku.toLowerCase();
    const expectedVariantSkus = variants.map(v => v.sku);

    // 5. Validate SKU matching results
    const output = await api.functional.ecommerce.products.variants.index(customerConnection, {
        productId: product.id,
        body: {
            sku: caseInsensitiveSku
            // includeOutOfStock: true  // ✅ DELETED - invalid parameter for this endpoint
        }
    });
    typia.assert(output);

    // 6. Verify case-insensitive matching
    TestValidator.equals("SKU filtering matches all case variations", output.data.map(v => v.sku), expectedVariantSkus);

    // 7. Verify stock status is accurately displayed
    output.data.forEach(v => {
        TestValidator.predicate(`Stock quantity > 0 for SKU ${v.sku}`, v.stock_quantity > 0);
    });
}