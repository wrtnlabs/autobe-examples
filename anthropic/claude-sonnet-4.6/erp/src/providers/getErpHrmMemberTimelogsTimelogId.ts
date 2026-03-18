import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
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
  timelogId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimelog> {
  // Step 1: Fetch a lightweight version of the timelog for authorization
  const timelogAuth = await MyGlobal.prisma.erp_hrm_timelogs.findUniqueOrThrow({
    where: { id: props.timelogId },
    select: {
      organization_member_id: true,
      project: {
        select: {
          organization_id: true,
        },
      },
    },
  });
  // Step 2: Find the authenticated member's organization_member record in the same organization
  const authOrgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        member_id: props.member.id,
        organization_id: timelogAuth.project.organization_id,
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
  // Step 3: Authorization check
  const isOwner = timelogAuth.organization_member_id === authOrgMember.id;
  const hasViewAll = authOrgMember.role.permissions.some(
    (p) => p.permission_code === "time:view_all",
  );
  if (!isOwner && !hasViewAll) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: Fetch full timelog with transformer select and transform
  const timelog = await MyGlobal.prisma.erp_hrm_timelogs.findUniqueOrThrow({
    where: { id: props.timelogId },
    ...ErpHrmTimelogTransformer.select(),
  });
  return ErpHrmTimelogTransformer.transform(timelog);
}
