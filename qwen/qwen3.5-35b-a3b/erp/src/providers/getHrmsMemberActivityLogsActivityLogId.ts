import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsActivityLog";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsActivityLogTransformer } from "../transformers/HrmsActivityLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmsMemberActivityLogsActivityLogId(props: {
  member: MemberPayload;
  activityLogId: string & tags.Format<"uuid">;
}): Promise<IHrmsActivityLog> {
  const session = await MyGlobal.prisma.hrms_member_sessions.findFirst({
    where: { id: props.member.session_id },
  });
  if (session === null) {
    throw new HttpException("Session expired", 403);
  }
  const activityLog = await MyGlobal.prisma.hrms_activity_logs.findFirst({
    where: { id: props.activityLogId },
    ...HrmsActivityLogTransformer.select(),
  });
  if (activityLog === null) {
    throw new HttpException("Not found", 404);
  }
  const member = await MyGlobal.prisma.hrms_members.findFirst({
    where: { id: props.member.id, deleted_at: null },
  });
  if (member === null) {
    throw new HttpException("Unauthorized", 403);
  }
  const organizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        member: { id: props.member.id },
        organization: { id: activityLog.organization.id },
        deleted_at: null,
      },
    });
  if (organizationMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  const hasPermission =
    await MyGlobal.prisma.hrms_organization_role_permissions.findFirst({
      where: {
        hrms_organization_role_id: organizationMember.hrms_organization_role_id,
        permission: "org:manage",
      },
    });
  if (hasPermission === null) {
    throw new HttpException("Forbidden", 403);
  }
  return await HrmsActivityLogTransformer.transform(activityLog);
}
