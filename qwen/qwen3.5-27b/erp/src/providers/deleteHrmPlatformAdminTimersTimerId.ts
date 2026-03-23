import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteHrmPlatformAdminTimersTimerId(props: {
  admin: AdminPayload;
  timerId: string & tags.Format<"uuid">;
}): Promise<void> {
  const timer = await MyGlobal.prisma.hrm_platform_timers.findUniqueOrThrow({
    where: { id: props.timerId },
    select: {
      id: true,
      hrm_platform_employee_id: true,
      deleted_at: true,
    },
  });
  if (timer.deleted_at !== null) {
    throw new HttpException("Timer already deleted", 410);
  }
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: { id: timer.hrm_platform_employee_id },
      select: { id: true, organization_id: true },
    });
  await MyGlobal.prisma.hrm_platform_timers.update({
    where: { id: timer.id },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: v4(),
      hrm_platform_organization_id: employee.organization_id,
      action_type: "timer_deleted",
      target_entity_type: "timer",
      target_entity_id: timer.id,
      action_description: `Timer ${timer.id} was deleted by admin`,
      created_at: new Date(),
    },
  });
}
