import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimerTransformer } from "../transformers/ErpHrmTimerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberTimersTimerId(props: {
  member: MemberPayload;
  timerId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimer> {
  // Step 1: Fetch timer with minimal fields for authorization probe
  const timerForAuth = await MyGlobal.prisma.erp_hrm_timers.findUniqueOrThrow({
    where: { id: props.timerId },
    select: {
      organization_member_id: true,
      organizationMember: {
        select: {
          organization_id: true,
        },
      },
    },
  });
  const organizationId = timerForAuth.organizationMember.organization_id;
  // Step 2: Resolve the authenticated member's org identity within the timer's organization
  const authOrgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        member_id: props.member.id,
        organization_id: organizationId,
        deleted_at: null,
      },
      select: {
        id: true,
        role: {
          select: {
            permissions: {
              select: {
                permission_code: true,
              },
            },
          },
        },
      },
    });
  if (authOrgMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Authorization — owner check first, then time:view_all permission
  const isOwner = timerForAuth.organization_member_id === authOrgMember.id;
  if (!isOwner) {
    const hasTimeViewAll = authOrgMember.role.permissions.some(
      (p) => p.permission_code === "time:view_all",
    );
    if (!hasTimeViewAll) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Step 4: Fetch full timer with transformer select and transform
  const timer = await MyGlobal.prisma.erp_hrm_timers.findUniqueOrThrow({
    where: { id: props.timerId },
    ...ErpHrmTimerTransformer.select(),
  });
  return ErpHrmTimerTransformer.transform(timer);
}
