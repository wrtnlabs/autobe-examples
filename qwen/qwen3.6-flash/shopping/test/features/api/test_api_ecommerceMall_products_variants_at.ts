import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_products_variants_at(
  connection: api.IConnection,
) {
  const output: IEcommerceMallProductVariant =
    await api.functional.ecommerceMall.products.variants.at(connection, {
      productId: typia.random<string & tags.Format<"uuid">>(),
      variantId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
