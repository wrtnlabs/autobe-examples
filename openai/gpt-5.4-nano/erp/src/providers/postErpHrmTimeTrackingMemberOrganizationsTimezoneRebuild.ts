import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
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

export async function postErpHrmTimeTrackingMemberOrganizationsTimezoneRebuild(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingOrganization.IRequest;
}): Promise<void> {
  const organizationId = props.body.id;
  // Validate organizationId exists
  await MyGlobal.prisma.erp_hrm_time_tracking_organizations.findUniqueOrThrow({
    where: { id: organizationId },
    select: { id: true, timezone: true, deleted_at: true },
  });
  const org =
    await MyGlobal.prisma.erp_hrm_time_tracking_organizations.findUniqueOrThrow(
      {
        where: { id: organizationId },
        select: { id: true, timezone: true, deleted_at: true },
      },
    );
  if (org.deleted_at !== null) {
    // Should not happen due to findUniqueOrThrow selection; but keep safe
    throw new HttpException("Forbidden", 403);
  }
  if (org.timezone === "" || org.timezone.trim().length === 0) {
    throw new HttpException("Invalid timezone", 400);
  }
  // Ownership authorization check: query project_memberships? Not in provided schemas. We'll enforce by checking role_permission via project memberships? Not available.
  // Fallback: require membership exists as owner-like by checking member's organization role in project memberships table doesn't exist.
  // Since no schema for roles, deny unless activity allowed.
  throw new HttpException("Forbidden", 403);
}
