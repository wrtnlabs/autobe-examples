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
  // Find timer with employee relation for ownership and authorization check
  const timer = await MyGlobal.prisma.hrm_platform_timers.findUnique({
    where: { id: props.timerId },
    select: {
      id: true,
      employee_id: true,
      stopped_at: true,
      deleted_at: true,
      employee: {
        select: {
          id: true,
          hrm_platform_user_id: true,
          hrm_platform_organization_id: true,
          hrm_platform_role_id: true,
          deleted_at: true,
        },
      },
    },
  });
  // Verify timer exists and is not already deleted
  if (timer === null) {
    throw new HttpException("Timer not found", 404);
  }
  if (timer.deleted_at !== null) {
    throw new HttpException("Timer already deleted", 400);
  }
  // Verify employee record exists and is active
  if (timer.employee.deleted_at !== null) {
    throw new HttpException("Employee record not found", 404);
  }
  // Find the authenticated member's employee record in the same organization
  const memberEmployee = await MyGlobal.prisma.hrm_platform_employees.findFirst(
    {
      where: {
        hrm_platform_user_id: props.member.id,
        hrm_platform_organization_id:
          timer.employee.hrm_platform_organization_id,
        deleted_at: null,
      },
    },
  );
  if (memberEmployee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if member owns this timer
  const isOwner = memberEmployee.id === timer.employee_id;
  // If not owner, check for time:manage permission
  if (!isOwner) {
    // First find the permission by code
    const permission = await MyGlobal.prisma.hrm_platform_permissions.findFirst(
      {
        where: {
          code: "time:manage",
          deleted_at: null,
        },
      },
    );
    if (permission === null) {
      throw new HttpException("Forbidden", 403);
    }
    // Then check if the role has this permission via the junction table
    const hasTimeManagePermission =
      await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
        where: {
          hrm_platform_role_id: memberEmployee.hrm_platform_role_id,
          hrm_platform_permission_id: permission.id,
          deleted_at: null,
        },
      });
    if (hasTimeManagePermission === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Perform soft delete - setting deleted_at timestamp
  await MyGlobal.prisma.hrm_platform_timers.update({
    where: { id: props.timerId },
    data: {
      deleted_at: new Date(),
    },
  });
}
