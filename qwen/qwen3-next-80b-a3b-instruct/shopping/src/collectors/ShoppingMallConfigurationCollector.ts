import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallConfigurationCollector {
  export async function collect(props: {
    body: IShoppingMallConfiguration.ICreate;
  }) {
    const key = Object.keys(props.body)[0];
    const value = props.body[key];
    return {
      id: v4(),
      key: key,
      value: value.toString(),
      category: "",
      description: "",
      enabled: false,
      created_at: new Date(),
      updated_at: new Date(),
    } satisfies Prisma.shopping_mall_configurationsCreateInput;
  }
}
