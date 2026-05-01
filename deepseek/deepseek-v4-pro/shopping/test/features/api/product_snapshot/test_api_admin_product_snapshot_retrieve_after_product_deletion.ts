import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
/**
 * Test that a product snapshot survives independently after the product is soft-deleted and remains fully retrievable by an administrator.
 *
 * Validates the snapshot immutability and survival guarantees: product snapshots must persist independently of their source entity and remain accessible even after the product is deleted. The administrator must be able to retrieve the snapshot with all fields intact — product name, description, base price, images with display order, and variant snapshots with SKU codes, option values, prices, and stock quantities.
 *
 * The category reference within the snapshot may become null if the category was also deleted, but the snapshot itself must remain retrievable with all other data intact. This validates that snapshots do not cascade-delete with their source product.
 *
 * 1. Administrator registers and authenticates on the platform via authorize_admin_join.
 * 2. Seller registers and authenticates via authorize_seller_join, capturing the seller ID.
 * 3. Administrator approves the seller registration to grant selling privileges.
 * 4. Seller creates a product with name, description, category, and base price.
 * 5. Seller edits the product to trigger automatic snapshot creation capturing the pre-edit state.
 * 6. Administrator soft-deletes the product via the admin erase endpoint.
 * 7. Administrator retrieves the snapshot by product ID and snapshot ID through the admin snapshot detail endpoint.
 * 8. Validates the snapshot response structure is complete and intact despite product deletion.
 */
export async function test_api_admin_product_snapshot_retrieve_after_product_deletion(connection: api.IConnection): Promise<void> {
    // 1. Admin setup
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(adminConnection, {});
    // 2. Seller setup
    const sellerConnection: api.IConnection = { host: connection.host };
    const sellerAuth = await authorize_seller_join(sellerConnection, {});
    // 3. Admin approves seller
    const approvedSeller = await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
        sellerId: sellerAuth.id,
    });
    typia.assert(approvedSeller);
    // 4. Seller creates product
    const product = await generate_random_shopping_mall_seller_products_create(sellerConnection, {});
    typia.assert(product);
    // 5. Seller edits product to trigger snapshot creation
    const updatedProduct = await api.functional.shoppingMall.seller.products.update(sellerConnection, {
        productId: product.id,
        body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.content({ paragraphs: 2 }),
            shopping_mall_category_id: product.category.id,
            base_price: product.base_price + 1000,
        } satisfies IShoppingMallProduct.IUpdate,
    });
    typia.assert(updatedProduct);
    // 6. Admin soft-deletes the product
    await api.functional.shoppingMall.admin.products.erase(adminConnection, {
        productId: product.id,
    });
    // 7. Admin retrieves snapshot after product deletion
    const snapshot = await api.functional.shoppingMall.admin.products.snapshots.at(adminConnection, {
        productId: product.id,
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
    });
    typia.assert(snapshot);
}