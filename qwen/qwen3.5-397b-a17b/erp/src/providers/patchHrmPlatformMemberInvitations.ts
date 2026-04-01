import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformInvitation";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformInvitation";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformInvitationAtSummaryTransformer } from "../transformers/HrmPlatformInvitationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberInvitations(props: {
  member: MemberPayload;
  body: IHrmPlatformInvitation.IRequest;
}): Promise<IPageIHrmPlatformInvitation.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "invited_at";
  const direction = props.body.direction ?? "desc";
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      organization_id: {
        in: await MyGlobal.prisma.hrm_platform_organizations
          .findMany({
            where: { deleted_at: null },
            select: { id: true },
          })
          .then((orgs) => orgs.map((o) => o.id)),
      },
      user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      organization_id: true,
      role_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Not an employee of this organization", 403);
  }
  const rolePermissions =
    await MyGlobal.prisma.hrm_platform_role_permissions.findMany({
      where: {
        hrm_platform_role_id: employee.role_id,
      },
      select: {
        permission: true,
      },
    });
  const permissions = rolePermissions.map((p) => p.permission);
  const hasManageOrView =
    permissions.includes("employee:manage") ||
    permissions.includes("employee:view");
  if (!hasManageOrView) {
    throw new HttpException(
      "Forbidden: requires employee:manage or employee:view permission",
      403,
    );
  }
  const whereInput = {
    deleted_at: null,
    organization_id: employee.organization_id,
    ...(props.body.search !== undefined && {
      email: { contains: props.body.search },
    }),
    ...(props.body.status !== undefined && {
      status: props.body.status,
    }),
    ...(props.body.invitedAtFrom !== undefined && {
      invited_at: { gte: props.body.invitedAtFrom },
    }),
    ...(props.body.invitedAtTo !== undefined && {
      invited_at: { lte: props.body.invitedAtTo },
    }),
    ...(props.body.acceptedAtFrom !== undefined && {
      accepted_at: { gte: props.body.acceptedAtFrom },
    }),
    ...(props.body.acceptedAtTo !== undefined && {
      accepted_at: { lte: props.body.acceptedAtTo },
    }),
  } satisfies Prisma.hrm_platform_invitationsWhereInput;
  const orderByInput = {
    [sort]: direction,
  } satisfies Prisma.hrm_platform_invitationsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.hrm_platform_invitations.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmPlatformInvitationAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_invitations.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      HrmPlatformInvitationAtSummaryTransformer.transform,
    ),
  };
}
