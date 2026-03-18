import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmInvitation";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmInvitationAtSummaryTransformer } from "../transformers/ErpHrmInvitationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberOrganizationsOrganizationIdInvitations(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IErpHrmInvitation.IRequest;
}): Promise<IPageIErpHrmInvitation.ISummary> {
  // 1. Validate organization exists and is not soft-deleted
  await MyGlobal.prisma.erp_hrm_organizations.findUniqueOrThrow({
    where: { id: props.organizationId, deleted_at: null },
    select: { id: true },
  });
  // 2. Validate caller is a member of this organization
  const callerMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        organization_id: props.organizationId,
        member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        role: {
          select: {
            id: true,
            is_builtin: true,
            name: true,
            permissions: {
              select: { permission_code: true },
            },
          },
        },
      },
    });
  if (callerMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Check employee:manage permission
  const role = callerMember.role;
  const hasPermission =
    (role.is_builtin && (role.name === "Owner" || role.name === "Manager")) ||
    role.permissions.some((p) => p.permission_code === "employee:manage");
  if (!hasPermission) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Build where clause
  const whereInput = {
    erp_hrm_organization_id: props.organizationId,
    ...(props.body.status !== undefined &&
      props.body.status.length > 0 && {
        status: { in: props.body.status },
      }),
    ...(props.body.email !== undefined && {
      email: { contains: props.body.email, mode: "insensitive" as const },
    }),
    ...(props.body.invitingMemberId !== undefined && {
      erp_hrm_organization_member_id: props.body.invitingMemberId,
    }),
    ...((props.body.createdAtFrom !== undefined ||
      props.body.createdAtTo !== undefined) && {
      created_at: {
        ...(props.body.createdAtFrom !== undefined && {
          gte: new Date(props.body.createdAtFrom),
        }),
        ...(props.body.createdAtTo !== undefined && {
          lte: new Date(props.body.createdAtTo),
        }),
      },
    }),
  } satisfies Prisma.erp_hrm_invitationsWhereInput;
  // 5. Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // 6. Sort order
  const orderByInput = (
    props.body.sort === "createdAt_asc"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const }
  ) satisfies Prisma.erp_hrm_invitationsOrderByWithRelationInput;
  // 7. Query
  const data = await MyGlobal.prisma.erp_hrm_invitations.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ErpHrmInvitationAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_invitations.count({
    where: whereInput,
  });
  // 8. Transform and return
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmInvitationAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
