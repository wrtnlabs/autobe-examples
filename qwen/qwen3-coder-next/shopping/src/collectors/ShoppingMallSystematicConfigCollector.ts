import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystematicConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicConfig";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSystematicConfigCollector {
  export async function collect(props: {
    body: IShoppingMallSystematicConfig.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      config_key: "",
      config_value: "",
      config_type: "",
      description: "",
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.shopping_mall_systematic_configsCreateInput;
  }
}
