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
  // 1. Query the activity log with full data including organization and performedBy joins
  const activityLog =
    await MyGlobal.prisma.hrms_activity_logs.findUniqueOrThrow({
      where: { id: props.activityLogId },
      ...HrmsActivityLogTransformer.select(),
    });
  // 2. Verify the activity log belongs to the member's selected organization
  // We need to get the member's organization context from their session
  const session = await MyGlobal.prisma.hrms_member_sessions.findFirst({
    where: {
      id: props.member.session_id,
      hrms_member_id: props.member.id,
      expired_at: { gt: new Date() },
    },
  });
  if (session === null) {
    throw new HttpException("Unauthorized", 401);
  }
  // Check if activity log's organization matches member's selected organization
  if (activityLog.organization.id !== session.current_organization_id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Check that member has org:manage permission for this organization
  const memberOrg = await MyGlobal.prisma.hrms_organization_members.findFirst({
    where: {
      hrms_member_id: props.member.id,
      hrms_organization_id: activityLog.organization.id,
    },
  });
  if (memberOrg === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Get member's role and check for org:manage permission
  const role = await MyGlobal.prisma.hrms_organization_roles.findFirst({
    where: {
      id: memberOrg.hrms_organization_role_id,
    },
    include: {
      permissions: true,
    },
  });
  if (role === null) {
    throw new HttpException("Forbidden", 403);
  }
  const hasManagePermission = role.permissions.some(
    (p) => p.permission === "org:manage",
  );
  if (!hasManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Transform and return
  return await HrmsActivityLogTransformer.transform(activityLog);
}
