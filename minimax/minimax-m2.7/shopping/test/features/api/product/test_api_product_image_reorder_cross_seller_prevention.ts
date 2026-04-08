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
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_images_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_images_create";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_image_reorder_cross_seller_prevention(connection: api.IConnection): Promise<void> {
    // Step 1: Create admin connection for category creation
    const adminJoinConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(adminJoinConnection, {
        body: {
            actorType: "seller",
            requestedGrade: "admin",
            reason: "Need admin access for test category creation",
            href: "https://test.com/admin",
            referrer: "https://test.com",
        },
    });
    // For testing, we need to use the admin's own credentials after join
    // Since admin join returns the actor's auth (seller/customer), we need super admin approval
    // But for E2E tests, we'll use a pre-existing admin or mock admin login
    // Using admin join result's email for login
    const adminEmail = typia.random<string & tags.Format<"email">>();
    const adminPassword = RandomGenerator.alphaNumeric(16);
    // Create a mock admin by joining first
    const adminJoinForLogin: api.IConnection = { host: connection.host };
    await authorize_admin_join(adminJoinForLogin, {
        body: {
            actorType: "seller",
            requestedGrade: "admin",
            reason: "Need admin access for test category creation",
            href: "https://test.com/admin",
            referrer: "https://test.com",
        },
    });
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_login(adminConnection, {
        body: {
            email: adminEmail,
            password: adminPassword,
            href: "https://test.com/admin",
            referrer: "https://test.com",
        } satisfies IEcommerceMallAdmin.ILogin,
    });
    // Step 2: Create category
    const category = await generate_random_ecommerce_mall_admin_categories_create(adminConnection, {
        body: {
            name: RandomGenerator.paragraph({ sentences: 1 }),
        },
    });
    typia.assert(category);
    // Step 3: Authenticate as first seller
    const seller1Connection: api.IConnection = { host: connection.host };
    const seller1Auth = await authorize_seller_join(seller1Connection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: "https://test.com/seller1",
            referrer: "https://test.com",
        },
    });
    typia.assert(seller1Auth);
    // Step 4: First seller creates product
    const product1 = await generate_random_ecommerce_mall_seller_products_create(seller1Connection, {
        body: {
            name: RandomGenerator.name(3),
            description: RandomGenerator.paragraph({ sentences: 3 }),
            categoryId: category.id,
            basePrice: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000>>(),
        },
    });
    typia.assert(product1);
    // Step 5: First seller uploads images
    const image1 = await generate_random_ecommerce_mall_seller_products_images_create(seller1Connection, {
        params: { productId: product1.id },
        body: {
            imageUrl: `https://test.com/images/product1-image1-${RandomGenerator.alphaNumeric(8)}.jpg` as string & tags.Format<"uri">,
            displayOrder: 0,
        },
    });
    typia.assert(image1);
    const image2 = await generate_random_ecommerce_mall_seller_products_images_create(seller1Connection, {
        params: { productId: product1.id },
        body: {
            imageUrl: `https://test.com/images/product1-image2-${RandomGenerator.alphaNumeric(8)}.jpg` as string & tags.Format<"uri">,
            displayOrder: 1,
        },
    });
    typia.assert(image2);
    // Step 6: Authenticate as second seller
    const seller2Connection: api.IConnection = { host: connection.host };
    const seller2Auth = await authorize_seller_join(seller2Connection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: "https://test.com/seller2",
            referrer: "https://test.com",
        },
    });
    typia.assert(seller2Auth);
    // Step 7: Second seller creates their own product
    const product2 = await generate_random_ecommerce_mall_seller_products_create(seller2Connection, {
        body: {
            name: RandomGenerator.name(3),
            description: RandomGenerator.paragraph({ sentences: 3 }),
            categoryId: category.id,
            basePrice: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000>>(),
        },
    });
    typia.assert(product2);
    // Step 8: Second seller uploads their own images
    const seller2Image = await generate_random_ecommerce_mall_seller_products_images_create(seller2Connection, {
        params: { productId: product2.id },
        body: {
            imageUrl: `https://test.com/images/product2-image1-${RandomGenerator.alphaNumeric(8)}.jpg` as string & tags.Format<"uri">,
            displayOrder: 0,
        },
    });
    typia.assert(seller2Image);
    // Step 9: Second seller attempts to reorder first seller's product images
    // This should fail because image IDs from product1 don't belong to seller2's product
    const reorderBody: IEcommerceMallProductImage.IReorder = {
        items: [
            {
                imageId: image1.id,
                displayOrder: 1,
            } satisfies IEcommerceMallProductImage.IReorderItem,
            {
                imageId: image2.id,
                displayOrder: 0,
            } satisfies IEcommerceMallProductImage.IReorderItem,
        ],
    };
    // Step 10: Verify that cross-seller reorder attempt fails with HTTP error
    await TestValidator.httpError("cross-seller image reorder should fail with 400 or 403", [400, 403], async () => {
        await api.functional.ecommerceMall.seller.products.images.reorder(seller2Connection, {
            productId: product1.id,
            body: reorderBody,
        });
    });
}