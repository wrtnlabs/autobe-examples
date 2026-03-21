import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmContract";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmContractAtSummaryTransformer } from "../transformers/ErpHrmContractAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmAdminEmployeesEmployeeIdContracts(props: {
  admin: AdminPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IErpHrmContract.IRequest;
}): Promise<IPageIErpHrmContract.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Verify employee exists
  await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
    where: { id: props.employeeId },
  });
  // Build WHERE conditions with date range filters
  const startDateCondition =
    props.body.startDateFrom || props.body.startDateTo
      ? {
          gte: props.body.startDateFrom
            ? new Date(
                props.body.startDateFrom as string & tags.Format<"date-time">,
              )
            : undefined,
          lte: props.body.startDateTo
            ? new Date(
                props.body.startDateTo as string & tags.Format<"date-time">,
              )
            : undefined,
        }
      : undefined;
  const endDateCondition =
    props.body.endDateFrom || props.body.endDateTo
      ? {
          gte: props.body.endDateFrom
            ? new Date(
                props.body.endDateFrom as string & tags.Format<"date-time">,
              )
            : undefined,
          lte: props.body.endDateTo
            ? new Date(
                props.body.endDateTo as string & tags.Format<"date-time">,
              )
            : undefined,
        }
      : undefined;
  const statusCondition =
    props.body.status === "ongoing" || props.body.status === "active"
      ? { end_date: null }
      : props.body.status === "ended"
        ? { end_date: { not: null } }
        : undefined;
  const whereConditions = {
    erp_hrm_employee_id: props.employeeId,
    ...(startDateCondition && { start_date: startDateCondition }),
    ...(endDateCondition && { end_date: endDateCondition }),
    ...(props.body.payPeriod && { pay_period: props.body.payPeriod }),
    ...(statusCondition && statusCondition),
  } satisfies Prisma.erp_hrm_contractsWhereInput;
  // Query contracts
  const data = await MyGlobal.prisma.erp_hrm_contracts.findMany({
    where: whereConditions,
    orderBy: { start_date: "desc" },
    skip,
    take: limit,
    ...ErpHrmContractAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_contracts.count({
    where: whereConditions,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmContractAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
