import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IPageIEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariant";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_customer_products_variants_stock_status_index(
  connection: api.IConnection,
) {
  const output: IPageIEcommerceMallProductVariant.ISummary =
    await api.functional.ecommerceMall.customer.products.variants.stock_status.index(
      connection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IEcommerceMallProductVariant.IRequest>(),
      },
    );
  typia.assert(output);
}
