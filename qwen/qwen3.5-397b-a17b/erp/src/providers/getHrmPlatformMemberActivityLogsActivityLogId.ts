import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
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
  const session =
    await MyGlobal.prisma.hrm_platform_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: {
        member: {
          select: {
            employees: {
              where: { deleted_at: null },
              select: { organization_id: true },
            },
          },
        },
      },
    });
  const organizationId = session.member.employees[0]?.organization_id;
  if (!organizationId) {
    throw new HttpException("Forbidden", 403);
  }
  const activityLog =
    await MyGlobal.prisma.hrm_platform_activity_logs.findUniqueOrThrow({
      where: {
        id: props.activityLogId,
        organization_id: organizationId,
        deleted_at: null,
      },
      ...HrmPlatformActivityLogTransformer.select(),
    });
  return await HrmPlatformActivityLogTransformer.transform(activityLog);
}
