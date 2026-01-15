import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantAttribute";
import type { IShoppingMallVariantAttributeValidation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantAttributeValidation";
import type { IShoppingMallVariantCompatibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantCompatibility";
import type { IShoppingMallVariantTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantTemplate";
import type { IShoppingMallVariantTemplateDefaultValues } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantTemplateDefaultValues";
import { prepare_random_shopping_mall_variant_template } from "../prepare/prepare_random_shopping_mall_variant_template";
export async function generate_random_shopping_mall_admin_products_templates_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallVariantTemplate.ICreate> | undefined;
    params: {
      productId: string;
    };
  },
): Promise<IShoppingMallVariantTemplate> {
  const prepared: IShoppingMallVariantTemplate.ICreate =
    prepare_random_shopping_mall_variant_template(props.body);
  return await api.functional.shoppingMall.admin.products.templates.create(
    connection,
    {
      body: prepared,
      productId: props.params.productId,
    },
  );
}
