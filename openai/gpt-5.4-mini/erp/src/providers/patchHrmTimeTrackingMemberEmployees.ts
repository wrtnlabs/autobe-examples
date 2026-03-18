import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingEmployee";
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

export async function patchHrmTimeTrackingMemberEmployees(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingEmployee.IRequest;
}): Promise<IPageIHrmTimeTrackingEmployee.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const orderBy: Prisma.hrm_time_tracking_employeesOrderByWithRelationInput =
    props.body.sort === "updated_at"
      ? { updated_at: "desc" }
      : { created_at: "desc" };
  const where: Prisma.hrm_time_tracking_employeesWhereInput = {
    deleted_at: null,
    ...(props.body.department_id !== undefined
      ? {
          department_id: props.body.department_id,
          department: {
            deleted_at: null,
            hrm_time_tracking_organization_id: MyGlobal.prisma
              ? undefined
              : undefined,
          },
        }
      : {}),
    ...(props.body.employment_type !== undefined
      ? { employment_type: props.body.employment_type }
      : {}),
    ...(props.body.status !== undefined ? { status: props.body.status } : {}),
    ...(props.body.search !== undefined
      ? {
          OR: [
            {
              position_title: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              userAccount: {
                email: {
                  contains: props.body.search,
                  mode: "insensitive",
                },
              },
            },
          ],
        }
      : {}),
  };
  const records = await MyGlobal.prisma.hrm_time_tracking_employees.findMany({
    where,
    orderBy,
    skip,
    take: limit,
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
      userAccount: {
        select: {
          id: true,
          email: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      role: {
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
      },
      department: {
        select: {
          id: true,
          name: true,
          description: true,
          parent_department_id: true,
          created_at: true,
          updated_at: true,
        },
      },
      position_title: true,
      employment_type: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const total: number = await MyGlobal.prisma.hrm_time_tracking_employees.count(
    {
      where,
    },
  );
  return {
    data: records.map((record) => ({
      id: record.id,
      organization: {
        id: record.organization.id,
        name: record.organization.name,
        description: record.organization.description,
        logoImageUrl: record.organization.logo_image_url,
        currency: record.organization.currency,
        timezone: record.organization.timezone,
        fiscalStartMonth: record.organization.fiscal_start_month,
        createdAt: record.organization.created_at.toISOString(),
        updatedAt: record.organization.updated_at.toISOString(),
        deletedAt:
          record.organization.deleted_at === null
            ? null
            : record.organization.deleted_at.toISOString(),
      },
      userAccount: {
        id: record.userAccount.id,
        email: record.userAccount.email,
        createdAt: record.userAccount.created_at.toISOString(),
        updatedAt: record.userAccount.updated_at.toISOString(),
        deletedAt:
          record.userAccount.deleted_at === null
            ? null
            : record.userAccount.deleted_at.toISOString(),
      },
      role: {
        id: record.role.id,
        organization: {
          id: record.role.organization.id,
          name: record.role.organization.name,
          description: record.role.organization.description,
          logoImageUrl: record.role.organization.logo_image_url,
          currency: record.role.organization.currency,
          timezone: record.role.organization.timezone,
          fiscalStartMonth: record.role.organization.fiscal_start_month,
          createdAt: record.role.organization.created_at.toISOString(),
          updatedAt: record.role.organization.updated_at.toISOString(),
          deletedAt:
            record.role.organization.deleted_at === null
              ? null
              : record.role.organization.deleted_at.toISOString(),
        },
        name: record.role.name,
        code: record.role.code,
        description: record.role.description,
        isBuiltin: record.role.is_builtin,
        sortOrder: record.role.sort_order,
        createdAt: record.role.created_at.toISOString(),
        updatedAt: record.role.updated_at.toISOString(),
        deletedAt:
          record.role.deleted_at === null
            ? null
            : record.role.deleted_at.toISOString(),
      },
      department:
        record.department === null
          ? null
          : {
              id: record.department.id,
              name: record.department.name,
              description: record.department.description,
              parentDepartmentId: record.department.parent_department_id,
              created_at: record.department.created_at.toISOString(),
              updated_at: record.department.updated_at.toISOString(),
            },
      positionTitle: record.position_title,
      employmentType: record.employment_type,
      status: record.status,
      createdAt: record.created_at.toISOString(),
      updatedAt: record.updated_at.toISOString(),
      deletedAt:
        record.deleted_at === null ? null : record.deleted_at.toISOString(),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
