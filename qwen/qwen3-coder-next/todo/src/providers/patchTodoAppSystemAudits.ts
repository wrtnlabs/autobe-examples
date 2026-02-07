import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppSystemAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSystemAudit";
import { ITodoAppSystemAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemAudit";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppSystemAudits(props: {
  body: ITodoAppSystemAudit.IRequest;
}): Promise<IPageITodoAppSystemAudit.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const whereInput = {} satisfies Prisma.todo_app_system_auditsWhereInput;
  const data = await MyGlobal.prisma.todo_app_system_audits.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
  });
  const total = await MyGlobal.prisma.todo_app_system_audits.count({
    where: whereInput,
  });
  return {
    data: data.map((record) => ({
      id: record.id as string & tags.Format<"uuid">,
      event_type: record.event_type,
      ip_address: record.ip_address,
      created_at: toISOStringSafe(record.created_at) as string &
        tags.Format<"date-time">,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
