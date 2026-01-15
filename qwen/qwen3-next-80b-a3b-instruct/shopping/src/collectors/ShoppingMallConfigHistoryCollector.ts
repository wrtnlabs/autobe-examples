import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallConfigHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfigHistory";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallConfigHistoryCollector {
  export async function collect(props: {
    body: IShoppingMallConfigHistory.ICreate;
    admin: IEntity;
  }) {
    return {
      id: v4(),
      change_type: "update", // Default value for system-driven change
      old_value: props.body.previous_value,
      new_value: props.body.new_value,
      description: "",
      created_at: new Date(),
      deleted_at: null,
      platformConfiguration: {
        connect: { id: props.body.configuration_id },
      },
      admin: {
        connect: { id: props.admin.id },
      },
    } satisfies Prisma.shopping_mall_config_historyCreateInput;
  }
}
