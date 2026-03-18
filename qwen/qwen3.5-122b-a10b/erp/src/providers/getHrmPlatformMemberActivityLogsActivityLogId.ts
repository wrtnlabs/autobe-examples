import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import { IHrmPlatformActivityLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLogDetail";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformActivityLogTransformer } from "../transformers/HrmPlatformActivityLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberActivityLogsActivityLogId(props: {
  member: MemberPayload;
  activityLogId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformActivityLog> {
  // Fetch activity log to get organization context
  const activityLog =
    await MyGlobal.prisma.hrm_platform_activity_logs.findUniqueOrThrow({
      where: { id: props.activityLogId },
      select: {
        id: true,
        organization_id: true,
      } satisfies Prisma.hrm_platform_activity_logsFindUniqueArgs["select"],
    });
  // Verify member has org:manage permission for the organization
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      hrm_platform_organization_id: activityLog.organization_id,
    },
    select: {
      hrm_platform_role_id: true,
    } satisfies Prisma.hrm_platform_employeesFindManyArgs["select"],
  });
  if (employee === null || employee.hrm_platform_role_id === null) {
    throw new HttpException("Forbidden", 403);
  }
  const hasPermission =
    await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
      where: {
        hrm_platform_role_id: employee.hrm_platform_role_id,
        permission: {
          name: "org:manage",
        },
      },
    });
  if (hasPermission === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Fetch full activity log with relations
  const fullActivityLog =
    await MyGlobal.prisma.hrm_platform_activity_logs.findUniqueOrThrow({
      where: { id: props.activityLogId },
      ...HrmPlatformActivityLogTransformer.select(),
    });
  return await HrmPlatformActivityLogTransformer.transform(fullActivityLog);
}
