import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuditLog";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallAuditLogCollector {
  export async function collect(props: {
    body: IShoppingMallAuditLog.ICreate;
    admin: IEntity;
    ip: string;
  }) {
    return {
      id: v4(),
      action_type: props.body.action,
      description: "Audit log entry",
      affected_table_name: props.body.target_entity_type,
      affected_record_id: null,
      ip_address: props.ip,
      created_at: new Date(),
      deleted_at: null,
      admin: {
        connect: { id: props.admin.id },
      },
    } satisfies Prisma.shopping_mall_audit_logsCreateInput;
  }
}
