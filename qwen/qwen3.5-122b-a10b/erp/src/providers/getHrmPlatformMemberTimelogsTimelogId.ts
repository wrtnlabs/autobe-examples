import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimelogTransformer } from "../transformers/HrmPlatformTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformTimelog> {
  // Find the member's employee record in the current organization
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
  });
  if (!employee) {
    throw new HttpException(
      "You are not an employee in this organization",
      403,
    );
  }
  // Fetch the timelog with all required relations
  const timelog = await MyGlobal.prisma.hrm_platform_timelogs.findUniqueOrThrow(
    {
      where: {
        id: props.timelogId,
        deleted_at: null,
      },
      select: HrmPlatformTimelogTransformer.select().select,
    } as const,
  );
  // Check authorization:
  // 1. Employee owns the timelog, OR
  // 2. Member has time:view_all permission (checked via role permissions)
  const isOwner = timelog.employee.id === employee.id;
  if (!isOwner) {
    // Check if member has time:view_all permission through their role
    // Query permissions via role_permissions join with permissions table
    const hasPermission =
      await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
        where: {
          hrm_platform_role_id: employee.hrm_platform_role_id,
          deleted_at: null,
          permission: {
            code: "time:view_all",
            deleted_at: null,
          },
        },
      });
    if (!hasPermission) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Transform and return
  return await HrmPlatformTimelogTransformer.transform(timelog as any);
}
