import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_seller_products_variants_create(
  connection: api.IConnection,
) {
  const output: IEcommerceMallProductVariant =
    await api.functional.ecommerceMall.seller.products.variants.create(
      connection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IEcommerceMallProductVariant.ICreate>(),
      },
    );
  typia.assert(output);
}
