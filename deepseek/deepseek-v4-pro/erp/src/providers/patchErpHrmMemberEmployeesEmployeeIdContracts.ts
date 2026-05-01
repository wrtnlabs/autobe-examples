import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmContractAtSummaryTransformer } from "../transformers/ErpHrmContractAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberEmployeesEmployeeIdContracts(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IErpHrmContract.IRequest;
}): Promise<IPageIErpHrmContract.ISummary> {
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  if (session.erp_hrm_organization_id === null) {
    throw new HttpException("No organization context selected", 400);
  }
  const organizationId: string & tags.Format<"uuid"> =
    session.erp_hrm_organization_id;
  const employee = await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
    where: {
      id: props.employeeId,
      erp_hrm_organization_id: organizationId,
      deleted_at: null,
    },
    select: { id: true, erp_hrm_member_id: true },
  });
  const memberEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: organizationId,
      deleted_at: null,
    },
    select: { id: true, erp_hrm_role_id: true },
  });
  if (memberEmployee === null) {
    throw new HttpException("Forbidden", 403);
  }
  const employeeViewPermission =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        erp_hrm_role_id: memberEmployee.erp_hrm_role_id,
        permission: {
          is: {
            key: "employee:view",
          },
        },
      },
      select: { id: true },
    });
  const hasEmployeeView = employeeViewPermission !== null;
  if (!hasEmployeeView && employee.erp_hrm_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const sortOrder: "asc" | "desc" = props.body.order ?? "desc";
  const orderBy = (
    props.body.sort === "endDate"
      ? { end_date: sortOrder }
      : props.body.sort === "payRate"
        ? { pay_rate: sortOrder }
        : props.body.sort === "workingHoursPerWeek"
          ? { working_hours_per_week: sortOrder }
          : { start_date: sortOrder }
  ) satisfies Prisma.erp_hrm_contractsOrderByWithRelationInput;
  const whereInput = {
    erp_hrm_employee_id: props.employeeId,
    deleted_at: null,
    ...(props.body.startDateFrom !== undefined &&
      props.body.startDateTo === undefined && {
        start_date: { gte: props.body.startDateFrom },
      }),
    ...(props.body.startDateFrom === undefined &&
      props.body.startDateTo !== undefined && {
        start_date: { lte: props.body.startDateTo },
      }),
    ...(props.body.startDateFrom !== undefined &&
      props.body.startDateTo !== undefined && {
        start_date: {
          gte: props.body.startDateFrom,
          lte: props.body.startDateTo,
        },
      }),
    ...(props.body.endDateFrom !== undefined &&
      props.body.endDateTo === undefined && {
        end_date: { gte: props.body.endDateFrom },
      }),
    ...(props.body.endDateFrom === undefined &&
      props.body.endDateTo !== undefined && {
        end_date: { lte: props.body.endDateTo },
      }),
    ...(props.body.endDateFrom !== undefined &&
      props.body.endDateTo !== undefined && {
        end_date: {
          gte: props.body.endDateFrom,
          lte: props.body.endDateTo,
        },
      }),
    ...(props.body.payPeriod !== undefined && {
      pay_period: { in: props.body.payPeriod },
    }),
    ...(props.body.search !== undefined && {
      notes: { contains: props.body.search },
    }),
  } satisfies Prisma.erp_hrm_contractsWhereInput;
  if (props.body.status === "active") {
    const currentTimestamp: string & tags.Format<"date-time"> = toISOStringSafe(
      new Date(),
    );
    const activeContract = await MyGlobal.prisma.erp_hrm_contracts.findFirst({
      where: {
        ...whereInput,
        OR: [{ end_date: null }, { end_date: { gte: currentTimestamp } }],
      },
      orderBy: { start_date: "desc" },
      ...ErpHrmContractAtSummaryTransformer.select(),
    });
    if (activeContract === null) {
      return {
        pagination: { current: 1, limit: 1, records: 0, pages: 0 },
        data: [],
      };
    }
    return {
      pagination: { current: 1, limit: 1, records: 1, pages: 1 },
      data: [
        await ErpHrmContractAtSummaryTransformer.transform(activeContract),
      ],
    };
  }
  if (props.body.status === "past") {
    const currentTimestamp: string & tags.Format<"date-time"> = toISOStringSafe(
      new Date(),
    );
    const activeContract = await MyGlobal.prisma.erp_hrm_contracts.findFirst({
      where: {
        erp_hrm_employee_id: props.employeeId,
        deleted_at: null,
        OR: [{ end_date: null }, { end_date: { gte: currentTimestamp } }],
      },
      orderBy: { start_date: "desc" },
      select: { id: true },
    });
    const pastWhereInput = {
      ...whereInput,
      ...(activeContract !== null && { id: { not: activeContract.id } }),
    } satisfies Prisma.erp_hrm_contractsWhereInput;
    const records = await MyGlobal.prisma.erp_hrm_contracts.findMany({
      where: pastWhereInput,
      ...ErpHrmContractAtSummaryTransformer.select(),
      skip,
      take: limit,
      orderBy,
    });
    const total = await MyGlobal.prisma.erp_hrm_contracts.count({
      where: pastWhereInput,
    });
    return {
      pagination: {
        current: page,
        limit,
        records: total,
        pages: Math.ceil(total / limit),
      },
      data: await ArrayUtil.asyncMap(
        records,
        ErpHrmContractAtSummaryTransformer.transform,
      ),
    };
  }
  const records = await MyGlobal.prisma.erp_hrm_contracts.findMany({
    where: whereInput,
    ...ErpHrmContractAtSummaryTransformer.select(),
    skip,
    take: limit,
    orderBy,
  });
  const total = await MyGlobal.prisma.erp_hrm_contracts.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      ErpHrmContractAtSummaryTransformer.transform,
    ),
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
// import { IPageIErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmContract";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchErpHrmMemberEmployeesEmployeeIdContracts(props: {
//   member: MemberPayload;
//   employeeId: string & tags.Format<"uuid">;
//   body: IErpHrmContract.IRequest;
// }): Promise<IPageIErpHrmContract.ISummary> {
//   const records = await MyGlobal.prisma.erp_hrm_contracts.findMany({
//     ...ErpHrmContractAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ErpHrmContractAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------