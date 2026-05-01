import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmDepartmentCollector } from "../collectors/ErpHrmDepartmentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmDepartmentTransformer } from "../transformers/ErpHrmDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberDepartments(props: {
  member: MemberPayload;
  body: IErpHrmDepartment.ICreate;
}): Promise<IErpHrmDepartment> {
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  const organizationId = session.erp_hrm_organization_id;
  if (organizationId === null) {
    throw new HttpException("No organization selected", 400);
  }
  if (props.body.parent_id) {
    const parent = await MyGlobal.prisma.erp_hrm_departments.findUniqueOrThrow({
      where: {
        id: props.body.parent_id,
        deleted_at: null,
      },
      select: { id: true, erp_hrm_organization_id: true, parent_id: true },
    });
    if (parent.erp_hrm_organization_id !== organizationId) {
      throw new HttpException("Parent department not found", 404);
    }
    if (parent.parent_id !== null) {
      throw new HttpException("Parent department already has a parent", 422);
    }
  }
  const record = await MyGlobal.prisma.erp_hrm_departments.create({
    data: await ErpHrmDepartmentCollector.collect({
      body: props.body,
      organization: {
        id: typia.assert<string & tags.Format<"uuid">>(organizationId),
      },
    }),
    ...ErpHrmDepartmentTransformer.select(),
  });
  return await ErpHrmDepartmentTransformer.transform(record);
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
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postErpHrmMemberDepartments(props: {
//   member: MemberPayload;
//   body: IErpHrmDepartment.ICreate;
// }): Promise<IErpHrmDepartment> {
//   const record = await MyGlobal.prisma.erp_hrm_departments.create({
//     data: await ErpHrmDepartmentCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ErpHrmDepartmentTransformer.select(),
//   });
//   return await ErpHrmDepartmentTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------