import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshot";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_snapshot_view_by_owner(connection: api.IConnection): Promise<void> {
    // 1. Create admin account for category setup
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(adminConnection, {});
    // 2. Create a category (required prerequisite for product creation)
    const category = await generate_random_ecommerce_mall_admin_admin_categories_create(adminConnection, {});
    typia.assert(category);
    // 3. Create seller with known password for later login
    const sellerPassword = RandomGenerator.alphaNumeric(16);
    const sellerEmail = typia.random<string & tags.Format<"email">>();
    const sellerJoinConnection: api.IConnection = { host: connection.host };
    await authorize_seller_join(sellerJoinConnection, {
        body: {
            email: sellerEmail,
            password: sellerPassword,
        },
    });
    // 4. Login as seller (seller may need to be approved)
    const sellerLoginConnection: api.IConnection = { host: connection.host };
    await authorize_seller_login(sellerLoginConnection, {
        body: {
            email: sellerEmail,
            password: sellerPassword,
            href: typia.random<string & tags.Format<"uri">>() as string & tags.Format<"uri">,
            referrer: typia.random<string & tags.Format<"uri">>() as string & tags.Format<"uri">,
        },
    });
    // 5. Create product (automatically generates initial snapshot)
    const product = await generate_random_ecommerce_mall_seller_sellers_me_products_create(sellerLoginConnection, {
        body: {
            name: RandomGenerator.name(3),
            description: RandomGenerator.paragraph({ sentences: 5 }),
            basePrice: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000>>(),
            categoryId: category.id,
        },
    });
    typia.assert(product);
    // 6. List product snapshots to obtain snapshotId
    const snapshotList = await api.functional.ecommerceMall.seller.sellers.me.products.snapshots(sellerLoginConnection, { productId: product.id });
    typia.assert(snapshotList);
    // Get the first snapshot (created during product creation)
    TestValidator.equals("has at least one snapshot", snapshotList.data.length > 0, true);
    const firstSnapshot = snapshotList.data[0];
    // 7. View specific snapshot
    const snapshot = await api.functional.ecommerceMall.seller.sellers.me.products._snapshots.at(sellerLoginConnection, {
        productId: product.id,
        snapshotId: firstSnapshot.id,
    });
    typia.assert(snapshot);
    // 8. Validate snapshot structure (IEcommerceMallProductSnapshot.IInvert)
    TestValidator.equals("snapshot id matches", snapshot.id, firstSnapshot.id);
    TestValidator.equals("product id matches", snapshot.product.id, product.id);
    TestValidator.equals("category name preserved", snapshot.categoryName, category.name);
    TestValidator.predicate("has valid createdAt timestamp", snapshot.createdAt.includes("T"));
    TestValidator.predicate("has non-empty name", snapshot.name.length > 0);
    TestValidator.predicate("has non-empty description", snapshot.description.length > 0);
    TestValidator.predicate("basePrice is positive", snapshot.basePrice > 0);
    // Validate images array structure
    TestValidator.predicate("images is array", Array.isArray(snapshot.productSnapshotImages));
    if (snapshot.productSnapshotImages.length > 0) {
        TestValidator.predicate("images have required fields", snapshot.productSnapshotImages.every(img => img.id !== undefined &&
            img.url !== undefined &&
            img.displayOrder !== undefined));
    }
    // Validate variants array structure
    TestValidator.predicate("variants is array", Array.isArray(snapshot.productSnapshotVariants));
    if (snapshot.productSnapshotVariants.length > 0) {
        TestValidator.predicate("variants are non-empty objects", snapshot.productSnapshotVariants.every(variant => typeof variant === "object" && variant !== null));
    }
}