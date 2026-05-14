import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IPageIEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductImage";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_seller_products_images_index(
  connection: api.IConnection,
) {
  const output: IPageIEcommerceMallProductImage.ISummary =
    await api.functional.ecommerceMall.seller.products.images.index(
      connection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IEcommerceMallProductImage.IRequest>(),
      },
    );
  typia.assert(output);
}
