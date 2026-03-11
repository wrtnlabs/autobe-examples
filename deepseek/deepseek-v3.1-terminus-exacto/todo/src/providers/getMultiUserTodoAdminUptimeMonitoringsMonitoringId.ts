import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUptimeMonitoring } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUptimeMonitoring";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { MultiUserTodoUptimeMonitoringTransformer } from "../transformers/MultiUserTodoUptimeMonitoringTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoAdminUptimeMonitoringsMonitoringId(props: {
  admin: AdminPayload;
  monitoringId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoUptimeMonitoring> {
  const monitoring =
    await MyGlobal.prisma.multi_user_todo_uptime_monitorings.findUniqueOrThrow({
      where: {
        id: props.monitoringId,
        deleted_at: null,
      },
      ...MultiUserTodoUptimeMonitoringTransformer.select(),
    });
  return await MultiUserTodoUptimeMonitoringTransformer.transform(monitoring);
}
