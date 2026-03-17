import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IPageIShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotImage";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
/**
 * Test snapshot image integrity after original image deletion.
 *
 * A seller creates a product with 3 images, edits to create snapshot S1,
 * then deletes one image from the product, edits again to create snapshot S2.
 * Retrieve images from S1 and validate:
 * (1) S1 still contains all 3 original images including the deleted one
 * (2) Image URLs and display_order in S1 remain unchanged
 * (3) S2 contains only the 2 remaining images
 *
 * This validates the business rule that snapshots preserve complete historical
 * image states even after images are deleted from the live product, ensuring
 * order items can reference exact product appearance at purchase time.
 */
export async function test_api_product_snapshot_image_after_deletion(connection: api.IConnection): Promise<void> {
    // 1. Create seller connection and authenticate
    const sellerConnection: api.IConnection = { host: connection.host };
    const sellerAuth = await authorize_seller_join(sellerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "TestPassword123!",
            shop_name: RandomGenerator.name(),
        },
    });
    typia.assert(sellerAuth);
    // 2. Create a product using the generation utility
    const product = await generate_random_shopping_mall_seller_products_create(sellerConnection, {
        body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.content({ paragraphs: 2 }),
            base_price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000>>(),
        },
    });
    typia.assert(product);
    // 3. Upload 3 images to the product with specific URLs for tracking
    const imageUrls = ArrayUtil.repeat(3, (index) => ({
        image_url: `https://example.com/product-${product.id}-image-${index}.jpg`,
        display_order: index,
    }));
    const createdImages: IShoppingMallProductImage[] = [];
    for (const imageData of imageUrls) {
        const image = await generate_random_shopping_mall_seller_products_images_create(sellerConnection, {
            body: imageData,
            params: { productId: product.id },
        });
        typia.assert(image);
        createdImages.push(image);
    }
    TestValidator.equals("3 images created", createdImages.length, 3);
    // 4. Edit product to create first snapshot (S1) with all 3 images
    const updatedProduct1 = await api.functional.shoppingMall.seller.products.update(sellerConnection, {
        productId: product.id,
        body: {
            name: `${product.name} - Updated`,
        },
    });
    typia.assert(updatedProduct1);
    // 5. Get snapshot list to obtain S1 snapshotId
    const snapshotsAfterFirstEdit = await api.functional.shoppingMall.seller.products.snapshots.index(sellerConnection, {
        productId: product.id,
        body: {
            page: 1,
            limit: 10,
            sort: "snapshot_at,desc",
        },
    });
    typia.assert(snapshotsAfterFirstEdit);
    TestValidator.predicate("at least one snapshot exists", snapshotsAfterFirstEdit.data.length > 0);
    const s1Snapshot = snapshotsAfterFirstEdit.data[0]!;
    const s1SnapshotId = s1Snapshot.id;
    // 6. Store original image data for validation
    const originalImageUrls = createdImages.map((img) => img.image_url);
    const originalDisplayOrders = createdImages.map((img) => img.display_order);
    // 7. Delete the last image (index 2) from the product
    const imageToDelete = createdImages[2]!;
    await api.functional.shoppingMall.seller.products.images.erase(sellerConnection, {
        productId: product.id,
        imageId: imageToDelete.id,
    });
    // 8. Edit product again to create second snapshot (S2) after image deletion
    const updatedProduct2 = await api.functional.shoppingMall.seller.products.update(sellerConnection, {
        productId: product.id,
        body: {
            description: `${product.description ?? ""} - Second update`,
        },
    });
    typia.assert(updatedProduct2);
    // 9. Get snapshot list to obtain S2 snapshotId
    const snapshotsAfterSecondEdit = await api.functional.shoppingMall.seller.products.snapshots.index(sellerConnection, {
        productId: product.id,
        body: {
            page: 1,
            limit: 10,
            sort: "snapshot_at,desc",
        },
    });
    typia.assert(snapshotsAfterSecondEdit);
    TestValidator.predicate("at least two snapshots exist", snapshotsAfterSecondEdit.data.length >= 2);
    // S2 is the most recent, S1 is the second most recent
    const s2Snapshot = snapshotsAfterSecondEdit.data[0]!;
    const s2SnapshotId = s2Snapshot.id;
    TestValidator.notEquals("S1 and S2 have different snapshot IDs", s1SnapshotId, s2SnapshotId);
    // 10. Retrieve images from S1 (should have all 3 original images)
    const s1ImagesResponse = await api.functional.shoppingMall.seller.products.snapshots.images.index(sellerConnection, {
        productId: product.id,
        snapshotId: s1SnapshotId,
        body: {
            page: 1,
            limit: 10,
            sort: "display_order,asc",
        },
    });
    typia.assert(s1ImagesResponse);
    const s1Images = s1ImagesResponse.data;
    TestValidator.equals("S1 contains all 3 original images", s1Images.length, 3);
    // Validate S1 image URLs and display orders match originals
    for (let i = 0; i < 3; i++) {
        TestValidator.equals(`S1 image ${i} URL matches original`,
            s1Images[i]!.image_url,
            originalImageUrls[i],
        );
        TestValidator.equals(
            `S1 image ${i} display_order matches original`,
            s1Images[i]!.display_order,
            originalDisplayOrders[i],
        );
    }
    // 11. Retrieve images from S2 (should have only 2 remaining images)
    const s2ImagesResponse = await api.functional.shoppingMall.seller.products.snapshots.images.index(sellerConnection, {
        productId: product.id,
        snapshotId: s2SnapshotId,
        body: {
            page: 1,
            limit: 10,
            sort: "display_order,asc",
        },
    });
    typia.assert(s2ImagesResponse);
    const s2Images = s2ImagesResponse.data;
    TestValidator.equals("S2 contains only 2 images (deleted image not included)", s2Images.length, 2);
    // Validate S2 contains only the first 2 images (not the deleted one)
    for (let i = 0; i < 2; i++) {
        TestValidator.equals(`S2 image ${i} URL matches original`,
            s2Images[i]!.image_url,
            originalImageUrls[i],
        );
        TestValidator.equals(
            `S2 image ${i} display_order matches original`,
            s2Images[i]!.display_order,
            originalDisplayOrders[i],
        );
    }
    // 12. Verify the deleted image is NOT in S2
    const deletedImageFoundInS2 = s2Images.some((img) => img.image_url === originalImageUrls[2]);
    TestValidator.predicate("deleted image not found in S2", !deletedImageFoundInS2);
}