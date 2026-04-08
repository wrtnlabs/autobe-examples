import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { prepare_random_ecommerce_mall_product } from "../prepare/prepare_random_ecommerce_mall_product";

export async function generate_random_ecommerce_mall_seller_products_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallProduct.ICreate>;
  }
): Promise<IEcommerceMallProduct> {
  const prepared: IEcommerceMallProduct.ICreate = prepare_random_ecommerce_mall_product(
    props.body
  );
  const result: IEcommerceMallProduct = await api.functional.ecommerceMall.seller.products.create(
    connection,
    {
      body: prepared,
    }
  );
  return result;
}