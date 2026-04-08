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

export async function postShoppingMallAdministratorAdministratorsAdministratorIdPromote(props: {
  administrator: AdministratorPayload;
  administratorId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdministrator> {
  // Validate caller is super administrator
  const caller =
    await MyGlobal.prisma.shopping_mall_administrators.findUniqueOrThrow({
      where: {
        id: props.administrator.id,
        deleted_at: null,
        banned: false,
      },
      select: {
        id: true,
        grade: true,
      },
    });
  if (caller.grade !== "super") {
    throw new HttpException("Insufficient privileges", 403);
  }
  // Find target administrator
  const target =
    await MyGlobal.prisma.shopping_mall_administrators.findUniqueOrThrow({
      where: {
        id: props.administratorId,
        deleted_at: null,
      },
      select: {
        id: true,
        grade: true,
        banned: true,
      },
    });
  // Validate target is not banned
  if (target.banned === true) {
    throw new HttpException("Cannot promote banned administrator", 400);
  }
  // Validate target is regular grade (not already super)
  if (target.grade !== "regular") {
    throw new HttpException(
      "Administrator is already super administrator",
      400,
    );
  }
  // Update grade to super
  await MyGlobal.prisma.shopping_mall_administrators.update({
    where: {
      id: props.administratorId,
    },
    data: {
      grade: "super",
      updated_at: new Date(),
    },
  });
  // Fetch and return updated administrator
  const updated =
    await MyGlobal.prisma.shopping_mall_administrators.findUniqueOrThrow({
      where: {
        id: props.administratorId,
      },
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
// export async function postShoppingMallAdministratorAdministratorsAdministratorIdPromote(props: {
//   administrator: AdministratorPayload;
//   administratorId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallAdministrator> {
//   const record = await MyGlobal.prisma.shopping_mall_administrators.findFirstOrThrow({
//     ...ShoppingMallAdministratorTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallAdministratorTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------