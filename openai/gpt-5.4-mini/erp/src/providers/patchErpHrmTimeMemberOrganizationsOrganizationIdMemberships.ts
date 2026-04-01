import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeOrganizationMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationMembership";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeOrganizationMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeOrganizationMembership";
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

export async function patchErpHrmTimeMemberOrganizationsOrganizationIdMemberships(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IErpHrmTimeOrganizationMembership.IRequest;
}): Promise<IPageIErpHrmTimeOrganizationMembership.ISummary> {
  await MyGlobal.prisma.erp_hrm_time_organizations.findUniqueOrThrow({
    where: { id: props.organizationId },
    select: {
      id: true,
    },
  });
  const callerMembership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirst({
      where: {
        erp_hrm_time_member_id: props.member.id,
        erp_hrm_time_organization_id: props.organizationId,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
        is_selected_context: true,
      },
    });
  if (callerMembership === null) {
    throw new HttpException("Forbidden", 403);
  }
  const page: number = props.body.page ?? 1;
  const limit: number = Math.min(props.body.limit ?? 100, 100);
  const skip: number = (page - 1) * limit;
  const order: "asc" | "desc" = props.body.order ?? "desc";
  const where: Prisma.erp_hrm_time_organization_membershipsWhereInput = {
    erp_hrm_time_organization_id: props.organizationId,
    deleted_at: null,
    ...(props.body.status !== undefined ? { status: props.body.status } : {}),
    ...(props.body.isSelectedContext !== undefined
      ? { is_selected_context: props.body.isSelectedContext }
      : {}),
    ...(props.body.memberId !== undefined
      ? { erp_hrm_time_member_id: props.body.memberId }
      : {}),
    ...(props.body.search !== undefined
      ? {
          OR: [
            { status: { contains: props.body.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const orderBy: Prisma.erp_hrm_time_organization_membershipsOrderByWithRelationInput =
    props.body.sort === "memberId"
      ? { erp_hrm_time_member_id: order }
      : props.body.sort === "status"
        ? { status: order }
        : props.body.sort === "isSelectedContext"
          ? { is_selected_context: order }
          : props.body.sort === "updatedAt"
            ? { updated_at: order }
            : { created_at: order };
  const data =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        member: {
          select: {
            id: true,
          },
        },
        organization: {
          select: {
            id: true,
          },
        },
        status: true,
        is_selected_context: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const records =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      async (row) =>
        ({
          id: row.id,
          member: {},
          organization: {},
          status: row.status,
          isSelectedContext: row.is_selected_context,
          createdAt: toISOStringSafe(row.created_at),
          updatedAt: toISOStringSafe(row.updated_at),
          deletedAt:
            row.deleted_at === null ? null : toISOStringSafe(row.deleted_at),
        }) satisfies IErpHrmTimeOrganizationMembership.ISummary,
    ),
  };
}
