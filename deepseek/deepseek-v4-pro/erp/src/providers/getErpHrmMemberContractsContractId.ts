import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmContractTransformer } from "../transformers/ErpHrmContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberContractsContractId(props: {
  member: MemberPayload;
  contractId: string & tags.Format<"uuid">;
}): Promise<IErpHrmContract> {
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findFirstOrThrow({
      where: {
        id: props.member.session_id,
      },
      select: {
        erp_hrm_organization_id: true,
      },
    });
  const organizationId = session.erp_hrm_organization_id;
  if (organizationId === null) {
    throw new HttpException("No organization selected", 400);
  }
  const authCheck = await MyGlobal.prisma.erp_hrm_contracts.findFirstOrThrow({
    where: {
      id: props.contractId,
      deleted_at: null,
    },
    select: {
      employee: {
        select: {
          erp_hrm_member_id: true,
          erp_hrm_organization_id: true,
        },
      },
    },
  });
  if (authCheck.employee.erp_hrm_organization_id !== organizationId) {
    throw new HttpException("Contract not found", 404);
  }
  const isOwnContract =
    authCheck.employee.erp_hrm_member_id === props.member.id;
  if (!isOwnContract) {
    const memberEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
      where: {
        erp_hrm_member_id: props.member.id,
        erp_hrm_organization_id: organizationId,
        deleted_at: null,
      },
      select: {
        role: {
          select: {
            is_builtin: true,
            name: true,
          },
        },
      },
    });
    if (memberEmployee === null) {
      throw new HttpException("Forbidden", 403);
    }
    const isPrivilegedBuiltin =
      memberEmployee.role.is_builtin &&
      (memberEmployee.role.name === "Owner" ||
        memberEmployee.role.name === "Manager");
    if (!isPrivilegedBuiltin) {
      const hasPermission =
        await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
          where: {
            role: {
              employees: {
                some: {
                  erp_hrm_member_id: props.member.id,
                  erp_hrm_organization_id: organizationId,
                  deleted_at: null,
                },
              },
            },
            permission: {
              key: "employee:view",
            },
          },
        });
      if (hasPermission === null) {
        throw new HttpException("Forbidden", 403);
      }
    }
  }
  const contract = await MyGlobal.prisma.erp_hrm_contracts.findUniqueOrThrow({
    where: { id: props.contractId },
    ...ErpHrmContractTransformer.select(),
  });
  return await ErpHrmContractTransformer.transform(contract);
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
// import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getErpHrmMemberContractsContractId(props: {
//   member: MemberPayload;
//   contractId: string & tags.Format<"uuid">;
// }): Promise<IErpHrmContract> {
//   const record = await MyGlobal.prisma.erp_hrm_contracts.findFirstOrThrow({
//     ...ErpHrmContractTransformer.select(),
//     where: { ... },
//   });
//   return await ErpHrmContractTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------