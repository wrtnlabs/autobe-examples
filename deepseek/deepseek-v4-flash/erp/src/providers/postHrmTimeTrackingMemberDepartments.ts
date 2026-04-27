import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingDepartmentCollector } from "../collectors/HrmTimeTrackingDepartmentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingDepartmentTransformer } from "../transformers/HrmTimeTrackingDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingMemberDepartments(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingDepartment.ICreate;
}): Promise<IHrmTimeTrackingDepartment> {
  // 1. Resolve organization from the member's employee record
  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      hrm_time_tracking_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      hrm_time_tracking_organization_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException(
      "Member is not associated with any organization",
      403,
    );
  }
  const organizationId: string = employee.hrm_time_tracking_organization_id;
  // 2. Validate name is non-empty
  const name: string = props.body.name.trim();
  if (name.length === 0) {
    throw new HttpException("Department name must not be empty", 400);
  }
  // 3. Validate name uniqueness within the organization
  const existing =
    await MyGlobal.prisma.hrm_time_tracking_departments.findFirst({
      where: {
        name: name,
        hrm_time_tracking_organization_id: organizationId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (existing !== null) {
    throw new HttpException(
      "A department with this name already exists in the organization",
      409,
    );
  }
  // 4. If parentId is provided, validate parent department
  if (props.body.parentId !== undefined && props.body.parentId !== null) {
    const parent =
      await MyGlobal.prisma.hrm_time_tracking_departments.findFirst({
        where: {
          id: props.body.parentId,
          hrm_time_tracking_organization_id: organizationId,
          deleted_at: null,
        },
        select: {
          id: true,
          parent_id: true,
        },
      });
    if (parent === null) {
      throw new HttpException(
        "Parent department not found in the organization",
        422,
      );
    }
    if (parent.parent_id !== null) {
      throw new HttpException(
        "Parent department must be a top-level department (cannot have a parent itself)",
        422,
      );
    }
  }
  // 5. Create the department using collector + transformer
  const record = await MyGlobal.prisma.hrm_time_tracking_departments.create({
    data: await HrmTimeTrackingDepartmentCollector.collect({
      body: props.body,
      organization: { id: organizationId },
    }),
    ...HrmTimeTrackingDepartmentTransformer.select(),
  });
  return await HrmTimeTrackingDepartmentTransformer.transform(record);
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
// import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmTimeTrackingMemberDepartments(props: {
//   member: MemberPayload;
//   body: IHrmTimeTrackingDepartment.ICreate;
// }): Promise<IHrmTimeTrackingDepartment> {
//   const record = await MyGlobal.prisma.hrm_time_tracking_departments.create({
//     data: await HrmTimeTrackingDepartmentCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmTimeTrackingDepartmentTransformer.select(),
//   });
//   return await HrmTimeTrackingDepartmentTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------