import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemVersion";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSystemVersionCollector {
  export async function collect(props: {
    body: IShoppingMallSystemVersion.ICreate;
  }) {
    const id = v4();
    return {
      id,
      entity_name: props.body.entity_name,
      entity_id: props.body.entity_id,
      version_number: props.body.version_number,
      changed_fields: props.body.changed_fields,
      change_description: props.body.change_description ?? null,
      changed_by: props.body.changed_by ?? null,
      created_at: new Date(props.body.created_at),
      updated_at: new Date(props.body.updated_at),
      deleted_at: props.body.deleted_at ?? null,
    } satisfies Prisma.shopping_mall_system_versionsCreateInput;
  }
}
