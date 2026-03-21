import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmEmployeeAtSummaryTransformer } from "../transformers/ErpHrmEmployeeAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberEmployees(props: {
  member: MemberPayload;
  body: IErpHrmEmployee.IRequest;
}): Promise<IPageIErpHrmEmployee.ISummary> {
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  if (session.erp_hrm_organization_id === null) {
    throw new HttpException("No organization context selected", 400);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    erp_hrm_organization_id: session.erp_hrm_organization_id,
    deleted_at: null,
    ...(props.body.departmentId !== undefined && {
      erp_hrm_department_id: props.body.departmentId,
    }),
    ...(props.body.employmentType !== undefined && {
      employment_type: props.body.employmentType,
    }),
    ...(props.body.status !== undefined && {
      status: props.body.status,
    }),
    ...(props.body.search !== undefined && {
      member: {
        display_name: {
          contains: props.body.search,
          mode: "insensitive" as const,
        },
      },
    }),
  } satisfies Prisma.erp_hrm_employeesWhereInput;
  const data = await MyGlobal.prisma.erp_hrm_employees.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ErpHrmEmployeeAtSummaryTransformer.select(),
  });
  const records = await MyGlobal.prisma.erp_hrm_employees.count({
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
      records: records,
      pages: Math.ceil(records / limit),
    } satisfies IPage.IPagination,
  };
}
