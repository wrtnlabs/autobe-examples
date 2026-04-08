import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAdminRolesValidate(props: {
  admin: AdminPayload;
  body: IErpHrmRole.IValidationRequest;
}): Promise<IErpHrmRole.IValidationResult> {
  const errors: string[] = [];
  // Normalize role name for case-insensitive comparison
  const normalizedName = props.body.name.toLowerCase().trim();
  // Validation check 1: Built-in role name conflict (case-insensitive)
  const builtinRoleNames = ["owner", "manager", "employee"];
  if (builtinRoleNames.includes(normalizedName)) {
    errors.push("Role name is reserved");
  }
  // Validation check 2: Check if role name already exists globally (case-insensitive)
  // Note: erp_hrm_admins does not have erp_hrm_organization_id column,
  // so we perform global uniqueness check across all organizations
  const existingRole = await MyGlobal.prisma.erp_hrm_roles.findFirst({
    where: {
      name: {
        equals: normalizedName,
        mode: "insensitive",
      },
      deleted_at: null,
    },
  });
  if (existingRole !== null) {
    errors.push("Role name already exists in organization");
  }
  return {
    isValid: errors.length === 0,
    errors: errors,
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
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postErpHrmAdminRolesValidate(props: {
//   admin: AdminPayload;
//   body: IErpHrmRole.IValidationRequest;
// }): Promise<IErpHrmRole.IValidationResult> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------