import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteHrmPlatformMemberTimersTimerId(props: {
  member: MemberPayload;
  timerId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find and validate timer exists and is not deleted
  const timer = await MyGlobal.prisma.hrm_platform_timers.findUniqueOrThrow({
    where: {
      id: props.timerId,
      deleted_at: null,
    },
    select: {
      id: true,
      employee_id: true,
      project_id: true,
      project: {
        select: {
          hrm_platform_organization_id: true,
        },
      },
    },
  });
  // 2. Find the employee record for this member in the timer's organization
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      hrm_platform_organization_id: timer.project.hrm_platform_organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_platform_role_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Member not found in this organization", 403);
  }
  // 3. Check authorization: either own timer or has time:manage permission
  const isOwner = timer.employee_id === employee.id;
  if (!isOwner) {
    // Check for time:manage permission
    const role = await MyGlobal.prisma.hrm_platform_roles.findUnique({
      where: { id: employee.hrm_platform_role_id },
      select: {
        id: true,
        permissions: {
          select: {
            permission: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
    const hasTimeManage = role?.permissions.some(
      (rp) => rp.permission.name === "time:manage",
    );
    if (!hasTimeManage) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // 4. Soft delete the timer (set deleted_at)
  await MyGlobal.prisma.hrm_platform_timers.update({
    where: { id: props.timerId },
    data: {
      deleted_at: new Date(),
    },
  });
}
