import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { ErpHrmEmployeeTransformer } from "../transformers/ErpHrmEmployeeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberEmployeesEmployeeIdReactivate(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
}): Promise<IErpHrmEmployee> {
  const targetEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      id: props.employeeId,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
      erp_hrm_organization_id: true,
    },
  });
  if (targetEmployee === null) {
    throw new HttpException("Employee not found", 404);
  }
  const callerEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: targetEmployee.erp_hrm_organization_id,
      deleted_at: null,
      role: {
        rolePermissions: {
          some: {
            permission: {
              key: "employee:manage",
            },
          },
        },
      },
    },
    select: {
      id: true,
    },
  });
  if (callerEmployee === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (targetEmployee.status === "active") {
    const record = await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
      where: {
        id: props.employeeId,
        deleted_at: null,
      },
      ...ErpHrmEmployeeTransformer.select(),
    });
    return await ErpHrmEmployeeTransformer.transform(record);
  }
  await MyGlobal.prisma.erp_hrm_employees.update({
    where: {
      id: props.employeeId,
    },
    data: {
      status: "active",
      updated_at: new Date(),
    },
  });
  const updated = await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
    where: {
      id: props.employeeId,
      deleted_at: null,
    },
    ...ErpHrmEmployeeTransformer.select(),
  });
  return await ErpHrmEmployeeTransformer.transform(updated);
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
// import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postErpHrmMemberEmployeesEmployeeIdReactivate(props: {
//   member: MemberPayload;
//   employeeId: string & tags.Format<"uuid">;
// }): Promise<IErpHrmEmployee> {
//   const record = await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
//     ...ErpHrmEmployeeTransformer.select(),
//     where: { ... },
//   });
//   return await ErpHrmEmployeeTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------