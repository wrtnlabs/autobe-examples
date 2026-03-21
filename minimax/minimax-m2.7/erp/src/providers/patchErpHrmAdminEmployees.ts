import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmEmployee";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmEmployeeAtSummaryTransformer } from "../transformers/ErpHrmEmployeeAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmAdminEmployees(props: {
  admin: AdminPayload;
  body: IErpHrmEmployee.IRequest;
}): Promise<IPageIErpHrmEmployee.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const orderByField = props.body.orderBy ?? "created_at";
  const orderDirection = props.body.order ?? "desc";
  const whereInput = {
    ...(props.body.status === "deactivated"
      ? { deleted_at: { not: null } }
      : { deleted_at: null }),
    ...(props.body.employment_type && {
      employment_type: props.body.employment_type,
    }),
    ...(props.body.erp_hrm_role_id && {
      erp_hrm_role_id: props.body.erp_hrm_role_id,
    }),
    ...(props.body.erp_hrm_department_id && {
      erp_hrm_department_id: props.body.erp_hrm_department_id,
    }),
    ...(props.body.position && {
      position: { contains: props.body.position, mode: "insensitive" as const },
    }),
  } satisfies Prisma.erp_hrm_employeesWhereInput;
  const orderByInput = {
    [orderByField]: orderDirection,
  } satisfies Prisma.erp_hrm_employeesOrderByWithRelationInput;
  const data = await MyGlobal.prisma.erp_hrm_employees.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ErpHrmEmployeeAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_employees.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmEmployeeAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
