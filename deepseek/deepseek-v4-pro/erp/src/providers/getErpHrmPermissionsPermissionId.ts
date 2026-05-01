import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmPermissionTransformer } from "../transformers/ErpHrmPermissionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmPermissionsPermissionId(props: {
  permissionId: string & tags.Format<"uuid">;
}): Promise<IErpHrmPermission> {
  const permission =
    await MyGlobal.prisma.erp_hrm_permissions.findUniqueOrThrow({
      where: { id: props.permissionId },
      ...ErpHrmPermissionTransformer.select(),
    });
  return await ErpHrmPermissionTransformer.transform(permission);
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
// import { IErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPermission";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getErpHrmPermissionsPermissionId(props: {
//   permissionId: string & tags.Format<"uuid">;
// }): Promise<IErpHrmPermission> {
//   const record = await MyGlobal.prisma.erp_hrm_permissions.findFirstOrThrow({
//     ...ErpHrmPermissionTransformer.select(),
//     where: { ... },
//   });
//   return await ErpHrmPermissionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------