import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmOrganizationContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationContext";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmEmployeeAtSummaryTransformer } from "../transformers/ErpHrmEmployeeAtSummaryTransformer";
import { ErpHrmOrganizationAtSummaryTransformer } from "../transformers/ErpHrmOrganizationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberOrganizationContext(props: {
  member: MemberPayload;
  body: IErpHrmOrganizationContext.ICreate;
}): Promise<IErpHrmOrganizationContext> {
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: props.body.organizationId,
      deleted_at: null,
    },
    ...ErpHrmEmployeeAtSummaryTransformer.select(),
  });
  if (!employee) {
    throw new HttpException("You are not a member of this organization", 403);
  }
  if (employee.status !== "active") {
    throw new HttpException(
      "Your employee record is deactivated in this organization",
      403,
    );
  }
  const org = await MyGlobal.prisma.erp_hrm_organizations.findUnique({
    where: { id: props.body.organizationId },
    ...ErpHrmOrganizationAtSummaryTransformer.select(),
  });
  if (!org) {
    throw new HttpException("Organization not found", 404);
  }
  const rolePermissions =
    await MyGlobal.prisma.erp_hrm_role_permissions.findMany({
      where: { erp_hrm_role_id: employee.role.id },
      select: { permission: true },
    });
  const permissions = rolePermissions.map((rp) => rp.permission);
  return {
    organization: await ErpHrmOrganizationAtSummaryTransformer.transform(org),
    employee: await ErpHrmEmployeeAtSummaryTransformer.transform(employee),
    permissions: permissions,
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
// import { IErpHrmOrganizationContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationContext";
// import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postErpHrmMemberOrganizationContext(props: {
//   member: MemberPayload;
//   body: IErpHrmOrganizationContext.ICreate;
// }): Promise<IErpHrmOrganizationContext> {
//   return {
//     organization: await ErpHrmOrganizationAtSummaryTransformer.transform(...),
//     employee: await ErpHrmEmployeeAtSummaryTransformer.transform(...),
//     permissions: ...,
//   };
// }
// ```
//--------------------------------------------------------------