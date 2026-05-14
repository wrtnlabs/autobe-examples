import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_seller_products_images_erase(
  connection: api.IConnection,
) {
  const output =
    await api.functional.ecommerceMall.seller.products.images.erase(
      connection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        imageId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
