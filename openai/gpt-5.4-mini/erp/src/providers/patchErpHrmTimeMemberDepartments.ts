import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeDepartment";
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

export async function patchErpHrmTimeMemberDepartments(props: {
  member: MemberPayload;
  body: IErpHrmTimeDepartment.IRequest;
}): Promise<IPageIErpHrmTimeDepartment.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where: Prisma.erp_hrm_time_departmentsWhereInput = {
    ...(props.body.search !== undefined
      ? { name: { contains: props.body.search, mode: "insensitive" } }
      : {}),
    ...(props.body.parentDepartmentId !== undefined
      ? props.body.parentDepartmentId === null
        ? { parent_department_id: null }
        : { parent_department_id: props.body.parentDepartmentId }
      : {}),
    ...(props.body.deleted !== undefined
      ? props.body.deleted
        ? { deleted_at: { not: null } }
        : { deleted_at: null }
      : { deleted_at: null }),
  };
  const departments = await MyGlobal.prisma.erp_hrm_time_departments.findMany({
    where,
    orderBy: [{ name: "asc" }, { created_at: "asc" }],
    skip,
    take: limit,
    select: {
      id: true,
      name: true,
      description: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const records = await MyGlobal.prisma.erp_hrm_time_departments.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
    data: departments.map((department) => ({
      id: department.id,
      name: department.name,
      description: department.description,
      organization: {},
      parentDepartment: null,
      createdAt: toISOStringSafe(department.created_at),
      updatedAt: toISOStringSafe(department.updated_at),
      deletedAt: department.deleted_at
        ? toISOStringSafe(department.deleted_at)
        : null,
    })),
  };
}
