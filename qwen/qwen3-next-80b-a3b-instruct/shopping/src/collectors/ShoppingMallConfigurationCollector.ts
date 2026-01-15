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
    return {
      id: v4(),
      key: props.body.key,
      value: props.body.value,
      type: "string",
      updated_at: new Date(),
    } satisfies Prisma.shopping_mall_configurationsCreateInput;
  }
}
