import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeEmployee";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeEmployeeAtSummaryTransformer } from "../transformers/ErpHrmTimeEmployeeAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeMemberEmployees(props: {
  member: MemberPayload;
  body: IErpHrmTimeEmployee.IRequest;
}): Promise<IPageIErpHrmTimeEmployee.ISummary> {
  const organizationId = (
    props.member as MemberPayload & {
      erp_hrm_time_organization_id?: string;
    }
  ).erp_hrm_time_organization_id;
  if (organizationId === undefined) {
    throw new HttpException("Organization context is required", 400);
  }
  const membership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirst({
      where: {
        erp_hrm_time_member_id: props.member.id,
        erp_hrm_time_organization_id: organizationId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (membership === null) {
    throw new HttpException("Organization context is invalid", 400);
  }
  const permission = await MyGlobal.prisma.erp_hrm_time_roles.findFirst({
    where: {
      erp_hrm_time_organization_id: organizationId,
      deleted_at: null,
      employees: {
        some: {
          erp_hrm_time_member_id: props.member.id,
          deleted_at: null,
        },
      },
    },
    select: {
      id: true,
      name: true,
    },
  });
  if (permission === null) {
    throw new HttpException("Forbidden", 403);
  }
  const hasEmployeeViewingPermission =
    permission.name === "Owner" || permission.name === "Manager";
  if (!hasEmployeeViewingPermission) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.departmentId !== undefined) {
    await MyGlobal.prisma.erp_hrm_time_departments.findFirstOrThrow({
      where: {
        id: props.body.departmentId,
        erp_hrm_time_organization_id: organizationId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.erp_hrm_time_employeesWhereInput = {
    erp_hrm_time_organization_id: organizationId,
    deleted_at: null,
    ...(props.body.departmentId === undefined
      ? {}
      : {
          erp_hrm_time_department_id: props.body.departmentId,
        }),
    ...(props.body.employmentType === undefined
      ? {}
      : {
          employment_type: props.body.employmentType,
        }),
    ...(props.body.status === undefined
      ? {}
      : {
          status: props.body.status,
        }),
    ...(props.body.search === undefined
      ? {}
      : {
          OR: [
            {
              position_title: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          ],
        }),
  };
  const orderBy: Prisma.erp_hrm_time_employeesOrderByWithRelationInput[] =
    props.body.sort === "created_at_asc"
      ? [{ created_at: "asc" }, { id: "asc" }]
      : props.body.sort === "position_title_asc"
        ? [{ position_title: "asc" }, { id: "asc" }]
        : [{ created_at: "desc" }, { id: "desc" }];
  const data = await MyGlobal.prisma.erp_hrm_time_employees.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...ErpHrmTimeEmployeeAtSummaryTransformer.select(),
  });
  const records = await MyGlobal.prisma.erp_hrm_time_employees.count({ where });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmTimeEmployeeAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: records,
      pages: Math.ceil(records / limit),
    } satisfies IPage.IPagination,
  };
}
