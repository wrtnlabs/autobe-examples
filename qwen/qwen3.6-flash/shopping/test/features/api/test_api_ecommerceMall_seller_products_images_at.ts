import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_seller_products_images_at(
  connection: api.IConnection,
) {
  const output: IEcommerceMallProductImage =
    await api.functional.ecommerceMall.seller.products.images.at(connection, {
      productId: typia.random<string & tags.Format<"uuid">>(),
      imageId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
