import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformContractCollector } from "../collectors/HrmPlatformContractCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformContractTransformer } from "../transformers/HrmPlatformContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberContracts(props: {
  member: MemberPayload;
  body: IHrmPlatformContract.ICreate;
}): Promise<IHrmPlatformContract> {
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.findFirst({
    where: {
      id: props.member.session_id,
      expired_at: { gt: new Date() },
      hrm_platform_member_id: props.member.id,
      member: {
        id: props.member.id,
        is_active: true,
        deleted_at: null,
      },
    },
  });
  if (session === null) {
    throw new HttpException("You're not enrolled", 403);
  }
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: {
        id: props.body.employee_id,
      },
      select: {
        id: true,
        hrm_platform_organization_id: true,
        status: true,
      },
    });
  if (employee.hrm_platform_organization_id !== props.body.organization_id) {
    throw new HttpException(
      "Employee does not belong to specified organization",
      400,
    );
  }
  if (employee.status !== "active") {
    throw new HttpException("Employee is not active", 400);
  }
  const memberRoles = await MyGlobal.prisma.hrm_platform_roles.findMany({
    where: {
      organization_id: props.body.organization_id,
      employees: {
        some: {
          hrm_platform_member_id: props.member.id,
        },
      },
    },
    include: {
      permissions: {
        select: {
          code: true,
        },
      },
    },
  });
  const hasPermission = memberRoles.some((role) =>
    role.permissions.some(
      (permission: { code: string }) => permission.code === "employee:view",
    ),
  );
  const isSelf = employee.id === props.member.id;
  if (!hasPermission && !isSelf) {
    throw new HttpException("Forbidden", 403);
  }
  const startDate = props.body.start_date;
  if (startDate === undefined) {
    throw new HttpException("Start date is required", 400);
  }
  if (props.body.end_date !== undefined) {
    const endDate = props.body.end_date;
    const startDateMs = new Date(startDate).getTime();
    const endDateMs = new Date(endDate).getTime();
    if (endDateMs < startDateMs) {
      throw new HttpException(
        "End date must be greater than or equal to start date",
        400,
      );
    }
  }
  if (props.body.compensation_amount !== undefined) {
    if (props.body.compensation_amount < 0) {
      throw new HttpException("Compensation amount must be non-negative", 400);
    }
  }
  const existingActiveContract =
    await MyGlobal.prisma.hrm_platform_contracts.findFirst({
      where: {
        hrm_platform_employee_id: props.body.employee_id,
        status: "active",
        deleted_at: null,
      },
    });
  if (existingActiveContract !== null) {
    const previousEndDate = new Date(
      new Date(startDate).getTime() - 24 * 60 * 60 * 1000,
    );
    await MyGlobal.prisma.hrm_platform_contracts.update({
      where: { id: existingActiveContract.id },
      data: {
        end_date: previousEndDate,
        status: "ended",
        updated_at: new Date(),
      },
    });
  }
  const created = await MyGlobal.prisma.hrm_platform_contracts.create({
    data: await HrmPlatformContractCollector.collect({
      body: props.body,
    }),
    ...HrmPlatformContractTransformer.select(),
  });
  return await HrmPlatformContractTransformer.transform(created);
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
// import { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmPlatformMemberContracts(props: {
//   member: MemberPayload;
//   body: IHrmPlatformContract.ICreate;
// }): Promise<IHrmPlatformContract> {
//   const record = await MyGlobal.prisma.hrm_platform_contracts.create({
//     data: await HrmPlatformContractCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmPlatformContractTransformer.select(),
//   });
//   return await HrmPlatformContractTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------