import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_images_single_image(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test the endpoint with a mock product ID
  // Note: Since there's no product creation API available, we test the endpoint structure
  // The actual product must exist in the database for the endpoint to return valid data
  const mockProductId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Retrieve product images - endpoint returns single ISummary (not array)
  const image = await api.functional.ecommerceMall.products.images.at(
    connection,
    {
      productId: mockProductId,
    },
  );
  // 3. Validate response type and structure
  typia.assert(image);
  // 4. Validate display_order is 1 (main thumbnail)
  TestValidator.equals(
    "display_order is 1 (main thumbnail)",
    image.display_order,
    1,
  );
  // 5. Validate image_url is valid URL string
  TestValidator.predicate(
    "image_url is valid URL",
    /^https?:\/\//.test(image.image_url),
  );
  // 6. Validate id is valid UUID format
  TestValidator.predicate(
    "id is valid UUID format",
    /^[0-9a-f-]{36}$/i.test(image.id),
  );
  // 7. Validate created_at is valid datetime format
  TestValidator.predicate(
    "created_at is valid datetime",
    !isNaN(Date.parse(image.created_at)),
  );
  // 8. Validate product reference exists
  typia.assert(image.product);
  TestValidator.predicate(
    "product has valid id",
    /^[0-9a-f-]{36}$/i.test(image.product.id),
  );
  TestValidator.predicate("product has name", image.product.name.length > 0);
}
