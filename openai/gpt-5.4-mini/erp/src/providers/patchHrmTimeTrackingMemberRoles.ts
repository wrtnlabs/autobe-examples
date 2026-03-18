import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingRole";
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

export async function patchHrmTimeTrackingMemberRoles(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingRole.IRequest;
}): Promise<IPageIHrmTimeTrackingRole.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const search: string | undefined =
    props.body.search !== undefined && props.body.search.trim().length > 0
      ? props.body.search.trim()
      : undefined;
  const organizationId: string | undefined =
    typeof (
      props.member as {
        organization_id?: unknown;
      }
    ).organization_id === "string"
      ? (
          props.member as {
            organization_id?: string;
          }
        ).organization_id
      : undefined;
  if (organizationId === undefined) {
    throw new HttpException("Organization context is required", 400);
  }
  const orderBy: Prisma.hrm_time_tracking_rolesOrderByWithRelationInput =
    props.body.sortBy === "createdAt"
      ? { created_at: props.body.sortDirection ?? "desc" }
      : props.body.sortBy === "sortOrder"
        ? { sort_order: props.body.sortDirection ?? "asc" }
        : props.body.sortBy === "isBuiltin"
          ? { is_builtin: props.body.sortDirection ?? "asc" }
          : { name: props.body.sortDirection ?? "asc" };
  const where: Prisma.hrm_time_tracking_rolesWhereInput = {
    organization_id: organizationId,
    deleted_at: null,
    ...(search !== undefined
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { code: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(props.body.isBuiltin !== undefined
      ? { is_builtin: props.body.isBuiltin }
      : {}),
    ...(props.body.assignedOnly === true
      ? {
          employeeRoles: {
            some: {
              deleted_at: null,
              effective_to: null,
            },
          },
        }
      : {}),
  };
  const data = await MyGlobal.prisma.hrm_time_tracking_roles.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      organization: {
        select: {
          id: true,
          name: true,
          description: true,
          logo_image_url: true,
          currency: true,
          timezone: true,
          fiscal_start_month: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      name: true,
      code: true,
      description: true,
      is_builtin: true,
      sort_order: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const total = await MyGlobal.prisma.hrm_time_tracking_roles.count({ where });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((record) => ({
      id: record.id,
      organization: {
        id: record.organization.id,
        name: record.organization.name,
        description: record.organization.description,
        logoImageUrl: record.organization.logo_image_url,
        currency: record.organization.currency,
        timezone: record.organization.timezone,
        fiscalStartMonth: record.organization.fiscal_start_month,
        createdAt: toISOStringSafe(record.organization.created_at),
        updatedAt: toISOStringSafe(record.organization.updated_at),
        deletedAt:
          record.organization.deleted_at !== null
            ? toISOStringSafe(record.organization.deleted_at)
            : null,
      } satisfies IHrmTimeTrackingOrganization.ISummary,
      name: record.name,
      code: record.code,
      description: record.description,
      isBuiltin: record.is_builtin,
      sortOrder: record.sort_order,
      createdAt: toISOStringSafe(record.created_at),
      updatedAt: toISOStringSafe(record.updated_at),
      deletedAt:
        record.deleted_at !== null ? toISOStringSafe(record.deleted_at) : null,
    })),
  };
}
