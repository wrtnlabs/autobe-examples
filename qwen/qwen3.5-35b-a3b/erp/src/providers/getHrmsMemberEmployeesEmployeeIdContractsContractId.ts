import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import { IHrmsEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployeeContract";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsEmployeeContractTransformer } from "../transformers/HrmsEmployeeContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmsMemberEmployeesEmployeeIdContractsContractId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  contractId: string & tags.Format<"uuid">;
}): Promise<IHrmsEmployeeContract> {
  const contract =
    await MyGlobal.prisma.hrms_employee_contracts.findUniqueOrThrow({
      where: {
        id: props.contractId,
        deleted_at: null,
      },
      ...HrmsEmployeeContractTransformer.select(),
    });
  if (contract.employee.id !== props.employeeId) {
    throw new HttpException(
      "Contract does not belong to the specified employee",
      404,
    );
  }
  const employeeMembership =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (employeeMembership !== null) {
    return await HrmsEmployeeContractTransformer.transform(contract);
  }
  const memberMemberships =
    await MyGlobal.prisma.hrms_organization_members.findMany({
      where: {
        hrms_member_id: props.member.id,
        deleted_at: null,
      },
      include: {
        organization: true,
        organizationRole: {
          include: {
            permissions: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });
  for (const membership of memberMemberships) {
    const permissionIds = membership.organizationRole.permissions.map(
      (p: { id: string }) => p.id,
    );
    if (permissionIds.includes("employee:view")) {
      return await HrmsEmployeeContractTransformer.transform(contract);
    }
  }
  throw new HttpException("Forbidden", 403);
}
