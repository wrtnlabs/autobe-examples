import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import { IMultiUserTodoSystemMaintenanceLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoSystemMaintenanceLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { MultiUserTodoSystemMaintenanceLogTransformer } from "../transformers/MultiUserTodoSystemMaintenanceLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoAdminSystemMaintenanceLogsMaintenanceLogId(props: {
  admin: AdminPayload;
  maintenanceLogId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoSystemMaintenanceLog> {
  // Query the specific maintenance log entry using transformer select
  const maintenanceLog =
    await MyGlobal.prisma.multi_user_todo_system_maintenance_logs.findUniqueOrThrow(
      {
        where: { id: props.maintenanceLogId },
        ...MultiUserTodoSystemMaintenanceLogTransformer.select(),
      },
    );
  // Transform the database result to DTO format
  return await MultiUserTodoSystemMaintenanceLogTransformer.transform(
    maintenanceLog,
  );
}
