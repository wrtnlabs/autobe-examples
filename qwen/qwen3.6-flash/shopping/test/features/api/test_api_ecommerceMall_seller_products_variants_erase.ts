import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_seller_products_variants_erase(
  connection: api.IConnection,
) {
  const output =
    await api.functional.ecommerceMall.seller.products.variants.erase(
      connection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        variantId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
