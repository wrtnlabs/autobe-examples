import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import { prepare_random_shopping_mall_section } from "../prepare/prepare_random_shopping_mall_section";
export async function generate_random_shopping_mall_admin_sections_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSection.ICreate> | undefined;
  },
): Promise<IShoppingMallSection> {
  const prepared: IShoppingMallSection.ICreate =
    prepare_random_shopping_mall_section(props.body);
  return await api.functional.shoppingMall.admin.sections.create(connection, {
    body: prepared,
  });
}
