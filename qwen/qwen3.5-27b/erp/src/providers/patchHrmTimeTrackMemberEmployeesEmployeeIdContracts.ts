import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployeeContract";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackEmployeeContract";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackEmployeeContractAtSummaryTransformer } from "../transformers/HrmTimeTrackEmployeeContractAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackMemberEmployeesEmployeeIdContracts(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackEmployeeContract.IRequest;
}): Promise<IPageIHrmTimeTrackEmployeeContract.ISummary> {
  // Verify employee exists (returns 404 if not found)
  await MyGlobal.prisma.hrm_time_track_employees.findUniqueOrThrow({
    where: {
      id: props.employeeId,
      deleted_at: null,
    },
  });
  // Apply pagination
  const page = props.body.page ?? 1;
  const limit = props.body.pageSize ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause with filters
  const whereInput = {
    hrm_time_track_employee_id: props.employeeId,
    deleted_at: null,
    ...(props.body.startDateFrom && {
      start_date: {
        gte: new Date(props.body.startDateFrom),
      },
    }),
    ...(props.body.startDateTo && {
      start_date: {
        lte: new Date(props.body.startDateTo),
      },
    }),
    ...(props.body.endDateFrom && {
      end_date: {
        gte: new Date(props.body.endDateFrom),
      },
    }),
    ...(props.body.endDateTo && {
      end_date: {
        lte: new Date(props.body.endDateTo),
      },
    }),
    ...(props.body.status === "active" && {
      end_date: null,
    }),
    ...(props.body.status === "ended" && {
      end_date: {
        not: null,
      },
    }),
    ...(props.body.payPeriod && {
      pay_period: props.body.payPeriod,
    }),
  } satisfies Prisma.hrm_time_track_employee_contractsWhereInput;
  // Build orderBy clause
  const sortField = props.body.sort ?? "start_date";
  const orderByDirection = (props.body.orderBy ?? "desc") as "asc" | "desc";
  const orderByInput = {
    [sortField]: orderByDirection,
  } satisfies Prisma.hrm_time_track_employee_contractsOrderByWithRelationInput;
  // Query contracts
  const records =
    await MyGlobal.prisma.hrm_time_track_employee_contracts.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...HrmTimeTrackEmployeeContractAtSummaryTransformer.select(),
    });
  // Get total count
  const total = await MyGlobal.prisma.hrm_time_track_employee_contracts.count({
    where: whereInput,
  });
  // Transform records
  const data = await ArrayUtil.asyncMap(
    records,
    HrmTimeTrackEmployeeContractAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  };
}
