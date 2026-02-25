import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfiguration";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSystemConfigurationCollector {
  export async function collect(props: {
    body: IShoppingMallSystemConfiguration.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      config_key: props.body.config_key,
      category: props.body.category ?? null,
      is_enabled: props.body.is_enabled,
      description: props.body.description ?? null,
      updated_by: props.body.updated_by ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    } satisfies Prisma.shopping_mall_system_configurationsCreateInput;
  }
}
