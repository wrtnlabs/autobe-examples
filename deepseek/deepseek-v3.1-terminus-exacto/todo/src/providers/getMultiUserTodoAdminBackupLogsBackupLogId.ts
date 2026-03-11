import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoBackupLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoBackupLog";
import { IMultiUserTodoDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoDataRetentionPolicy";
import { IMultiUserTodoSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoSystemConfiguration";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { MultiUserTodoBackupLogTransformer } from "../transformers/MultiUserTodoBackupLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getMultiUserTodoAdminBackupLogsBackupLogId(props: {
  admin: AdminPayload;
  backupLogId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoBackupLog> {
  const backupLog =
    await MyGlobal.prisma.multi_user_todo_backup_logs.findUniqueOrThrow({
      where: { id: props.backupLogId },
      ...MultiUserTodoBackupLogTransformer.select(),
    });
  return await MultiUserTodoBackupLogTransformer.transform(backupLog);
}
