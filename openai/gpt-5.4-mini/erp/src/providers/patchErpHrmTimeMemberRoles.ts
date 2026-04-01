import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeRole";
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

export async function patchErpHrmTimeMemberRoles(props: {
  member: MemberPayload;
  body: IErpHrmTimeRole.IRequest;
}): Promise<IPageIErpHrmTimeRole.ISummary> {
  const membership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirst({
      where: {
        erp_hrm_time_member_id: props.member.id,
        is_selected_context: true,
        deleted_at: null,
        status: "active",
      },
      select: {
        id: true,
        erp_hrm_time_organization_id: true,
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
      },
    });
  if (membership === null) {
    throw new HttpException("Selected organization context not found", 403);
  }
  const membershipWithRole =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirst({
      where: {
        id: membership.id,
      },
      select: {
        id: true,
        erp_hrm_time_organization_id: true,
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
      },
    });
  if (membershipWithRole === null) {
    throw new HttpException("Selected organization context not found", 403);
  }
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const search: string | undefined = props.body.search?.trim();
  const sortOrder: Prisma.erp_hrm_time_rolesOrderByWithRelationInput[] =
    props.body.sort !== undefined && props.body.sort.length > 0
      ? props.body.sort.reduce<
          Prisma.erp_hrm_time_rolesOrderByWithRelationInput[]
        >((acc, token) => {
          if (token === "name") {
            acc.push({ name: "asc" });
            return acc;
          }
          if (token === "-name") {
            acc.push({ name: "desc" });
            return acc;
          }
          if (token === "description") {
            acc.push({ description: "asc" });
            return acc;
          }
          if (token === "-description") {
            acc.push({ description: "desc" });
            return acc;
          }
          if (token === "builtIn") {
            acc.push({ is_builtin: "asc" });
            return acc;
          }
          if (token === "-builtIn") {
            acc.push({ is_builtin: "desc" });
            return acc;
          }
          if (token === "createdAt") {
            acc.push({ created_at: "asc" });
            return acc;
          }
          if (token === "-createdAt") {
            acc.push({ created_at: "desc" });
            return acc;
          }
          if (token === "updatedAt") {
            acc.push({ updated_at: "asc" });
            return acc;
          }
          if (token === "-updatedAt") {
            acc.push({ updated_at: "desc" });
            return acc;
          }
          return acc;
        }, [])
      : [];
  if (sortOrder.length === 0) {
    sortOrder.push({ is_builtin: "desc" });
    sortOrder.push({ name: "asc" });
    sortOrder.push({ created_at: "asc" });
  }
  const where: Prisma.erp_hrm_time_rolesWhereInput = {
    erp_hrm_time_organization_id: membership.erp_hrm_time_organization_id,
    deleted_at: null,
    ...(props.body.builtIn !== undefined
      ? { is_builtin: props.body.builtIn }
      : {}),
    ...(search !== undefined && search.length > 0
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(props.body.permissionKeys !== undefined &&
    props.body.permissionKeys.length > 0
      ? {
          rolePermissions: {
            some: {
              deleted_at: null,
              permission: {
                deleted_at: null,
                key: {
                  in: props.body.permissionKeys,
                },
              },
            },
          },
        }
      : {}),
  };
  const data = await MyGlobal.prisma.erp_hrm_time_roles.findMany({
    where,
    skip,
    take: limit,
    orderBy: sortOrder,
    select: {
      id: true,
      name: true,
      description: true,
      is_builtin: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const records = await MyGlobal.prisma.erp_hrm_time_roles.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      async (role): Promise<IErpHrmTimeRole.ISummary> => ({
        id: role.id,
        organization: {
          id: membership.erp_hrm_time_organization_id,
        },
        name: role.name,
        description: role.description,
        isBuiltin: role.is_builtin,
        createdAt: role.created_at.toISOString(),
        updatedAt: role.updated_at.toISOString(),
        deletedAt:
          role.deleted_at === null ? null : role.deleted_at.toISOString(),
      }),
    ),
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
  };
}
