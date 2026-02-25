import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystemConfigurationValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfigurationValue";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSystemConfigurationValueCollector {
  export async function collect(props: {
    body: IShoppingMallSystemConfigurationValue.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      configuration_name: props.body.configuration_name ?? "",
      value_string: null,
      value_integer: null,
      value_double: null,
      value_boolean: null,
      value_datetime: null,
      seller_id: props.body.seller_id ?? null,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      configuration: {
        connect: {
          id: props.body.configuration_id,
        },
      },
    } satisfies Prisma.shopping_mall_system_configuration_valuesCreateInput;
  }
}
