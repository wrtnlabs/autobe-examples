import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystematicVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicVersion";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSystematicVersionCollector {
  export async function collect(props: {
    body: IShoppingMallSystematicVersion.ICreate;
  }) {
    return {
      id: v4(),
      component_name: "",
      version_number: "",
      migration_timestamp: new Date(),
      description: "",
      is_active: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.shopping_mall_systematic_versionsCreateInput;
  }
}
