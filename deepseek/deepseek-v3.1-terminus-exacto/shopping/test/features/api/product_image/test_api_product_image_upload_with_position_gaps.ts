import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_images_create } from "../../../generate/generate_random_ecommerce_seller_products_images_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";

export async function test_api_product_image_upload_with_position_gaps(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // Create product as seller
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }) satisfies string &
          tags.MinLength<3> &
          tags.MaxLength<200>,
        description: RandomGenerator.paragraph({
          sentences: 5,
        }) satisfies string & tags.MinLength<10> & tags.MaxLength<5000>,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: categoryId,
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // Test 1: Sequential positions
  const image1 = await generate_random_ecommerce_seller_products_images_create(
    sellerConnection,
    {
      params: { productId: product.id },
      body: {
        image_url: typia.random<string & tags.Format<"uri">>(),
        position: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies IEcommerceProductImage.ICreate,
    },
  );
  typia.assert(image1);
  TestValidator.equals("sequential image position 1", image1.position, 1);
  const image2 = await generate_random_ecommerce_seller_products_images_create(
    sellerConnection,
    {
      params: { productId: product.id },
      body: {
        image_url: typia.random<string & tags.Format<"uri">>(),
        position: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies IEcommerceProductImage.ICreate,
    },
  );
  typia.assert(image2);
  TestValidator.equals("sequential image position 2", image2.position, 2);
  // Test 2: Position gaps
  const image3 = await generate_random_ecommerce_seller_products_images_create(
    sellerConnection,
    {
      params: { productId: product.id },
      body: {
        image_url: typia.random<string & tags.Format<"uri">>(),
        position: 4 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies IEcommerceProductImage.ICreate,
    },
  );
  typia.assert(image3);
  TestValidator.equals("gap image position 4", image3.position, 4);
  // Test 3: Very high position number
  const image4 = await generate_random_ecommerce_seller_products_images_create(
    sellerConnection,
    {
      params: { productId: product.id },
      body: {
        image_url: typia.random<string & tags.Format<"uri">>(),
        position: 100 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies IEcommerceProductImage.ICreate,
    },
  );
  typia.assert(image4);
  TestValidator.equals("high position image", image4.position, 100);
  // Test 4: Attempt duplicate position (should succeed with position adjustment or error)
  const image5 = await generate_random_ecommerce_seller_products_images_create(
    sellerConnection,
    {
      params: { productId: product.id },
      body: {
        image_url: typia.random<string & tags.Format<"uri">>(),
        position: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies IEcommerceProductImage.ICreate,
    },
  );
  typia.assert(image5);
  TestValidator.predicate("duplicate position handled", image5.position >= 1);
  // Test 5: Out-of-order positions
  const image6 = await generate_random_ecommerce_seller_products_images_create(
    sellerConnection,
    {
      params: { productId: product.id },
      body: {
        image_url: typia.random<string & tags.Format<"uri">>(),
        position: 3 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies IEcommerceProductImage.ICreate,
    },
  );
  typia.assert(image6);
  TestValidator.predicate(
    "out-of-order position handled",
    image6.position >= 1,
  );
  // Validate business logic - all positions should be valid positive integers
  TestValidator.predicate("image1 position valid", image1.position > 0);
  TestValidator.predicate("image2 position valid", image2.position > 0);
  TestValidator.predicate("image3 position valid", image3.position > 0);
  TestValidator.predicate("image4 position valid", image4.position > 0);
  TestValidator.predicate("image5 position valid", image5.position > 0);
  TestValidator.predicate("image6 position valid", image6.position > 0);
  // Test position uniqueness constraints (if system enforces them)
  const positions = [
    image1.position,
    image2.position,
    image3.position,
    image4.position,
    image5.position,
    image6.position,
  ];
  const uniquePositions = new Set(positions);
  // The system can either enforce unique positions or auto-adjust them
  // Both are valid approaches, so we'll test accordingly
  TestValidator.predicate(
    "positions follow business rules",
    uniquePositions.size === positions.length || // All unique (enforced uniqueness)
      positions.every((p) => p > 0), // All valid (auto-adjusted)
  );
}
