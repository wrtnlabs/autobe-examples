import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemSetting";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSystemSettingCollector {
  export async function collect(props: {
    body: IShoppingMallSystemSetting.ICreate;
  }) {
    return {
      id: v4(),
      key: "example_key",
      value: "example_value",
      description: null,
      data_type: "string",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.shopping_mall_system_settingsCreateInput;
  }
}
