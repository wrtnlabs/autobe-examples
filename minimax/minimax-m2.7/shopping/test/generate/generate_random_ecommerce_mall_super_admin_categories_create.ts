import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IConnection } from "@nestia/fetcher";
import { prepare_random_ecommerce_mall_category } from "../prepare/prepare_random_ecommerce_mall_category";

export async function generate_random_ecommerce_mall_super_admin_categories_create(
  connection: IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallCategory.ICreate>;
  }
): Promise<IEcommerceMallCategory> {
  const prepared: IEcommerceMallCategory.ICreate = prepare_random_ecommerce_mall_category(
    props.body
  );
  const result: IEcommerceMallCategory = await api.functional.ecommerceMall.superAdmin.categories.create(
    connection,
    {
      body: prepared,
    },
  );
  return result;
}