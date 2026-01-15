import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallDataExport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDataExport";
import { IShoppingMallDataExportFilters } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDataExportFilters";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallDataExportCollector {
  export async function collect(props: {
    body: IShoppingMallDataExport.ICreate;
    admin: IEntity;
  }) {
    return {
      id: v4(),
      format: props.body.format,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
      admin: {
        connect: { id: props.admin.id },
      },
    } satisfies Prisma.shopping_mall_data_exportsCreateInput;
  }
}
