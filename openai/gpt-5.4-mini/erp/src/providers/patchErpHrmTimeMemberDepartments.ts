import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
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
import { ErpHrmTimeDepartmentAtSummaryTransformer } from "../transformers/ErpHrmTimeDepartmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeMemberDepartments(props: {
  member: MemberPayload;
  body: IErpHrmTimeDepartment.IRequest;
}): Promise<IPageIErpHrmTimeDepartment.ISummary> {
  const organizationId = (
    props.member as unknown as {
      erp_hrm_time_organization_id?: string | null;
    }
  ).erp_hrm_time_organization_id;
  if (organizationId === undefined || organizationId === null) {
    throw new HttpException("Unauthorized organization context", 401);
  }
  if (
    props.body.sortBy !== undefined &&
    props.body.sortBy !== "name" &&
    props.body.sortBy !== "createdAt"
  ) {
    throw new HttpException("Unsupported sortBy value", 400);
  }
  if (
    props.body.sortOrder !== undefined &&
    props.body.sortOrder !== "asc" &&
    props.body.sortOrder !== "desc"
  ) {
    throw new HttpException("Unsupported sortOrder value", 400);
  }
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where = {
    erp_hrm_time_organization_id: organizationId,
    ...(props.body.parentDepartmentId !== undefined
      ? { parent_department_id: props.body.parentDepartmentId }
      : {}),
    ...(props.body.includeDeleted === true ? {} : { deleted_at: null }),
    ...(props.body.search !== undefined
      ? {
          name: {
            contains: props.body.search,
            mode: "insensitive",
          },
        }
      : {}),
  } satisfies Prisma.erp_hrm_time_departmentsWhereInput;
  const orderBy = (
    props.body.sortBy === "createdAt"
      ? { created_at: props.body.sortOrder ?? "desc" }
      : { name: props.body.sortOrder ?? "asc" }
  ) satisfies Prisma.erp_hrm_time_departmentsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.erp_hrm_time_departments.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    ...ErpHrmTimeDepartmentAtSummaryTransformer.select(),
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
    data: await ErpHrmTimeDepartmentAtSummaryTransformer.transformAll(data),
  };
}
