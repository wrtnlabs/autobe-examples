import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallAdministratorTransformer } from "../transformers/ShoppingMallAdministratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorAdministratorsAdministratorIdBan(props: {
  administrator: AdministratorPayload;
  administratorId: string & tags.Format<"uuid">;
  body: IShoppingMallAdministrator.IBanRequest;
}): Promise<IShoppingMallAdministrator> {
  // Validate current administrator is super
  const currentAdmin =
    await MyGlobal.prisma.shopping_mall_administrators.findUniqueOrThrow({
      where: { id: props.administrator.id },
      select: { grade: true },
    });
  if (currentAdmin.grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  // Fetch target administrator
  const targetAdmin =
    await MyGlobal.prisma.shopping_mall_administrators.findUniqueOrThrow({
      where: { id: props.administratorId },
      select: { id: true },
    });
  // Prevent self-ban
  if (props.administrator.id === props.administratorId) {
    throw new HttpException("Forbidden", 403);
  }
  // Update banned status
  await MyGlobal.prisma.shopping_mall_administrators.update({
    where: { id: props.administratorId },
    data: {
      banned: props.body.ban,
      updated_at: new Date(),
    },
  });
  // Fetch and return updated record
  const updated =
    await MyGlobal.prisma.shopping_mall_administrators.findUniqueOrThrow({
      where: { id: props.administratorId },
      ...ShoppingMallAdministratorTransformer.select(),
    });
  return await ShoppingMallAdministratorTransformer.transform(updated);
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
// import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallAdministratorAdministratorsAdministratorIdBan(props: {
//   administrator: AdministratorPayload;
//   administratorId: string & tags.Format<"uuid">;
//   body: IShoppingMallAdministrator.IBanRequest;
// }): Promise<IShoppingMallAdministrator> {
//   const record = await MyGlobal.prisma.shopping_mall_administrators.findFirstOrThrow({
//     ...ShoppingMallAdministratorTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallAdministratorTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------