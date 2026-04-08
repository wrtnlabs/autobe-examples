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
  const { member, body } = props;
  // Validate title length
  if (body.title.length < 1 || body.title.length > 255) {
    throw new HttpException("Title must be between 1 and 255 characters", 400);
  }
  // Validate status is 'active'
  if (body.status !== "active") {
    throw new HttpException("Status must be 'active' on creation", 400);
  }
  // Validate start_date is not in the past
  if (new Date(body.start_date) < new Date()) {
    throw new HttpException("Start date must be in the future", 400);
  }
  // Validate end_date if provided
  if (body.end_date !== undefined) {
    if (new Date(body.end_date) < new Date(body.start_date)) {
      throw new HttpException("End date must be >= start date", 400);
    }
  }
  // Validate compensation_amount if provided
  if (body.compensation_amount !== undefined && body.compensation_amount < 0) {
    throw new HttpException("Compensation amount must be >= 0", 400);
  }
  // Validate notes length if provided
  if (body.notes !== undefined && body.notes.length > 5000) {
    throw new HttpException("Notes must be <= 5000 characters", 400);
  }
  // Verify employee exists and belongs to the organization
  const employee = await MyGlobal.prisma.hrm_platform_employees.findUnique({
    where: { id: body.employee_id },
    select: {
      id: true,
      hrm_platform_organization_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee not found", 404);
  }
  // Verify employee belongs to the organization specified in body
  if (employee.hrm_platform_organization_id !== body.organization_id) {
    throw new HttpException(
      "Employee does not belong to the specified organization",
      400,
    );
  }
  // Authorization check
  const memberInOrganization =
    await MyGlobal.prisma.hrm_platform_employees.findFirst({
      where: {
        hrm_platform_member_id: member.id,
        hrm_platform_organization_id: body.organization_id,
      },
      select: {
        hrm_platform_role_id: true,
      },
    });
  if (memberInOrganization !== null) {
    const role = await MyGlobal.prisma.hrm_platform_roles.findUnique({
      where: { id: memberInOrganization.hrm_platform_role_id },
      include: { permissions: true },
    });
    if (role !== null) {
      const hasEmployeeViewPermission = role.permissions.some(
        (permission) => permission.code === "employee:view",
      );
      if (!hasEmployeeViewPermission) {
        throw new HttpException("Forbidden", 403);
      }
    }
  }
  // End previous active contract if exists
  const existingActiveContract =
    await MyGlobal.prisma.hrm_platform_contracts.findFirst({
      where: {
        hrm_platform_employee_id: body.employee_id,
        status: "active",
        end_date: null,
      },
    });
  if (existingActiveContract !== null) {
    const previousEndDate = new Date(new Date(body.start_date));
    previousEndDate.setDate(previousEndDate.getDate() - 1);
    await MyGlobal.prisma.hrm_platform_contracts.update({
      where: { id: existingActiveContract.id },
      data: {
        end_date: toISOStringSafe(previousEndDate),
        status: "ended",
        updated_at: toISOStringSafe(new Date()),
      },
    });
  }
  // Create the new contract
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