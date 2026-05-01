import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallAdminSessionTransformer } from "../transformers/ShoppingMallAdminSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminAdminsAdminIdSessionsSessionId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdminSession> {
  const record =
    await MyGlobal.prisma.shopping_mall_admin_sessions.findFirstOrThrow({
      where: {
        id: props.sessionId,
        shopping_mall_admin_id: props.adminId,
      },
      ...ShoppingMallAdminSessionTransformer.select(),
    });
  return await ShoppingMallAdminSessionTransformer.transform(record);
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
// import { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";
// import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getShoppingMallAdminAdminsAdminIdSessionsSessionId(props: {
//   admin: AdminPayload;
//   adminId: string & tags.Format<"uuid">;
//   sessionId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallAdminSession> {
//   const record = await MyGlobal.prisma.shopping_mall_admin_sessions.findFirstOrThrow({
//     ...ShoppingMallAdminSessionTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallAdminSessionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------