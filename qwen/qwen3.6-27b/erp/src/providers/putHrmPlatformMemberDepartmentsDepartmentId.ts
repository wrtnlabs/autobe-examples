import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformDepartmentTransformer } from "../transformers/HrmPlatformDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberDepartmentsDepartmentId(props: {
  member: MemberPayload;
  departmentId: string & tags.Format<"uuid">;
  body: IHrmPlatformDepartment.IUpdate;
}): Promise<IHrmPlatformDepartment> {
  const existing =
    await MyGlobal.prisma.hrm_platform_departments.findUniqueOrThrow({
      where: { id: props.departmentId },
      select: { id: true, hrm_platform_organization_id: true },
    });
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_member_id: props.member.id,
      hrm_platform_organization_id: existing.hrm_platform_organization_id,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.name !== undefined) {
    const duplicate = await MyGlobal.prisma.hrm_platform_departments.findFirst({
      where: {
        hrm_platform_organization_id: existing.hrm_platform_organization_id,
        name: props.body.name,
        id: { not: props.departmentId },
        deleted_at: null,
      },
    });
    if (duplicate !== null) {
      throw new HttpException(
        "Department name already exists in this organization",
        400,
      );
    }
  }
  if (props.body.parentId !== undefined && props.body.parentId !== null) {
    const parent =
      await MyGlobal.prisma.hrm_platform_departments.findUniqueOrThrow({
        where: { id: props.body.parentId },
        select: {
          id: true,
          hrm_platform_organization_id: true,
          hrm_platform_parent_department_id: true,
        },
      });
    if (
      parent.hrm_platform_organization_id !==
      existing.hrm_platform_organization_id
    ) {
      throw new HttpException(
        "Parent department must belong to the same organization",
        400,
      );
    }
    if (parent.id === props.departmentId) {
      throw new HttpException("Cannot set a department as its own parent", 400);
    }
    if (parent.hrm_platform_parent_department_id !== null) {
      throw new HttpException(
        "One-level nesting constraint: parent department cannot have its own parent",
        400,
      );
    }
  }
  await MyGlobal.prisma.hrm_platform_departments.update({
    where: { id: props.departmentId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.parentId !== undefined && {
        hrm_platform_parent_department_id: props.body.parentId,
      }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.hrm_platform_departments.findUniqueOrThrow({
      where: { id: props.departmentId },
      ...HrmPlatformDepartmentTransformer.select(),
    });
  return await HrmPlatformDepartmentTransformer.transform(updated);
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
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putHrmPlatformMemberDepartmentsDepartmentId(props: {
//   member: MemberPayload;
//   departmentId: string & tags.Format<"uuid">;
//   body: IHrmPlatformDepartment.IUpdate;
// }): Promise<IHrmPlatformDepartment> {
//   await MyGlobal.prisma.hrm_platform_departments.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_platform_departments.findUniqueOrThrow({
//     where: { ... },
//     ...HrmPlatformDepartmentTransformer.select(),
//   });
//   return await HrmPlatformDepartmentTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------