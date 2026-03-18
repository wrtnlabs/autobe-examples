import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimelogTransformer } from "../transformers/ErpHrmTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string;
}): Promise<IErpHrmTimelog> {
  // Find timelog with all nested relations using transformer select
  const timelog = await MyGlobal.prisma.erp_hrm_timelogs.findFirst({
    where: {
      id: props.timelogId,
      deleted_at: null,
    },
    ...ErpHrmTimelogTransformer.select(),
  });
  if (timelog === null) {
    throw new HttpException("Timelog not found", 404);
  }
  // Get current user's organization membership with permissions
  const currentMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        user_id: props.member.id,
        is_active: true,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
        role: {
          select: {
            rolePermissions: {
              select: {
                permission: true,
              },
            },
          },
        },
      },
    });
  if (currentMember === null) {
    throw new HttpException("Organization membership not found", 403);
  }
  // Get the timelog's organization member to check organization context
  const timelogOrgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        id: timelog.organizationMember.id,
      },
      select: {
        organization_id: true,
      },
    });
  if (timelogOrgMember === null) {
    throw new HttpException("Timelog organization member not found", 404);
  }
  // Verify same organization context
  if (timelogOrgMember.organization_id !== currentMember.organization_id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check permission: own timelog OR has time:manage permission
  const isOwner = timelog.organizationMember.id === currentMember.id;
  const hasManagePermission =
    currentMember.role?.rolePermissions.some(
      (rp: { permission: string }) => rp.permission === "time:manage",
    ) ?? false;
  if (!isOwner && !hasManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  return await ErpHrmTimelogTransformer.transform(timelog);
}
