import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallEmailTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailTemplate";
import { prepare_random_shopping_mall_email_template } from "../prepare/prepare_random_shopping_mall_email_template";
export async function generate_random_shopping_mall_admin_email_templates_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallEmailTemplate.ICreate>;
  },
): Promise<IShoppingMallEmailTemplate> {
  const prepared: IShoppingMallEmailTemplate.ICreate =
    prepare_random_shopping_mall_email_template(props.body);
  const result: IShoppingMallEmailTemplate =
    await api.functional.shoppingMall.admin.email.templates.create(connection, {
      body: prepared,
    });
  return result;
}
