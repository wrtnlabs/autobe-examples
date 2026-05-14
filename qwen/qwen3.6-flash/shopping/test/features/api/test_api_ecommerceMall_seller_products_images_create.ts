import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_seller_products_images_create(
  connection: api.IConnection,
) {
  const output: IEcommerceMallProductImage =
    await api.functional.ecommerceMall.seller.products.images.create(
      connection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IEcommerceMallProductImage.ICreate>(),
      },
    );
  typia.assert(output);
}
