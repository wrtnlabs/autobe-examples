import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPermissionTransformer } from "../transformers/HrmPermissionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmMemberPermissionsPermissionId(props: {
  member: MemberPayload;
  permissionId: string & tags.Format<"uuid">;
}): Promise<IHrmPermission> {
  const record = await MyGlobal.prisma.hrm_permissions.findUniqueOrThrow({
    where: { id: props.permissionId },
    ...HrmPermissionTransformer.select(),
  });
  return await HrmPermissionTransformer.transform(record);
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
// import { IHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPermission";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmMemberPermissionsPermissionId(props: {
//   member: MemberPayload;
//   permissionId: string & tags.Format<"uuid">;
// }): Promise<IHrmPermission> {
//   const record = await MyGlobal.prisma.hrm_permissions.findFirstOrThrow({
//     ...HrmPermissionTransformer.select(),
//     where: { ... },
//   });
//   return await HrmPermissionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------