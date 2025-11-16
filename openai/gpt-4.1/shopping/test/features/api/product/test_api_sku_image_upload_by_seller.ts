import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test the workflow for a seller uploading a SKU-level image, including
 * success, error, and security scenarios.
 *
 * 1. Register a new seller and authenticate to obtain authorization.
 * 2. Generate random UUIDs for both product and related SKU (simulate real IDs
 *    since product/SKU creation not available).
 * 3. Prepare valid pre-uploaded CDN URI, alt_text (optional) and a unique integer
 *    position for image ordering.
 * 4. Call the image upload API with cdn_uri and position fields (alt_text as
 *    random string or null).
 * 5. Confirm the image attaches only to shopping_mall_product_sku_id, with
 *    shopping_mall_product_id null/undefined.
 * 6. Ensure required fields enforcement: missing cdn_uri or position must produce
 *    an error (skipped as type system enforces this).
 * 7. Validate error when attempting to create a second image on the same SKU with
 *    duplicate position.
 * 8. Confirm access control by simulating an unauthenticated request (new
 *    connection instance) and expect an error.
 */
export async function test_api_sku_image_upload_by_seller(
  connection: api.IConnection,
) {
  // 1. Register seller
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        business_name: RandomGenerator.name(),
        registration_number: RandomGenerator.alphaNumeric(10),
        business_phone: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(sellerAuth);

  // 2. Generate random valid productId and skuId (simulate existing)
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const skuId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Prepare valid image data
  const cdn_uri: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const position: number & tags.Type<"int32"> = typia.random<
    number & tags.Type<"int32">
  >();
  const alt_text: string = RandomGenerator.paragraph({ sentences: 3 });

  // 3. Upload image (should succeed)
  const imgInput = {
    cdn_uri,
    alt_text,
    position,
    shopping_mall_product_id: null,
    shopping_mall_product_sku_id: skuId,
  } satisfies IShoppingMallProductImage.ICreate;
  const image: IShoppingMallProductImage =
    await api.functional.shoppingMall.seller.products.skus.images.create(
      connection,
      {
        productId,
        skuId,
        body: imgInput,
      },
    );
  typia.assert(image);
  TestValidator.equals(
    "image attaches only to SKU",
    image.shopping_mall_product_sku_id,
    skuId,
  );
  TestValidator.equals(
    "product association is null on SKU image",
    image.shopping_mall_product_id,
    null,
  );
  TestValidator.equals("cdn_uri matches input", image.cdn_uri, cdn_uri);
  TestValidator.equals("position matches input", image.position, position);
  TestValidator.equals("alt_text matches input", image.alt_text, alt_text);

  // 4. Try to upload a second image with duplicate position (should fail)
  await TestValidator.error(
    "duplicate position on same SKU is rejected",
    async () => {
      await api.functional.shoppingMall.seller.products.skus.images.create(
        connection,
        {
          productId,
          skuId,
          body: {
            cdn_uri: typia.random<string & tags.Format<"uri">>(),
            alt_text: RandomGenerator.paragraph({ sentences: 2 }),
            position, // same position as previous
            shopping_mall_product_id: null,
            shopping_mall_product_sku_id: skuId,
          } satisfies IShoppingMallProductImage.ICreate,
        },
      );
    },
  );

  // 5. Access control: Unauthenticated call must be rejected
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated actor cannot upload SKU image",
    async () => {
      await api.functional.shoppingMall.seller.products.skus.images.create(
        unauthConn,
        {
          productId,
          skuId,
          body: {
            cdn_uri: typia.random<string & tags.Format<"uri">>(),
            alt_text: null,
            position: typia.random<number & tags.Type<"int32">>(),
            shopping_mall_product_id: null,
            shopping_mall_product_sku_id: skuId,
          } satisfies IShoppingMallProductImage.ICreate,
        },
      );
    },
  );
}
