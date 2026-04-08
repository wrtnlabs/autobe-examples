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

export async function postShoppingMallAdministratorAdministratorsAdministratorIdDemote(props: {
  administrator: AdministratorPayload;
  administratorId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdministrator> {
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
    throw new HttpException(
      "Only super administrators can demote other administrators",
      403,
    );
  }
  const target =
    await MyGlobal.prisma.shopping_mall_administrators.findUniqueOrThrow({
      where: {
        id: props.administratorId,
        deleted_at: null,
      },
      select: {
        id: true,
        grade: true,
      },
    });
  if (target.grade !== "super") {
    throw new HttpException("Cannot demote regular administrator", 409);
  }
  if (target.id === caller.id) {
    throw new HttpException("Cannot demote yourself", 409);
  }
  const otherSuperAdminCount =
    await MyGlobal.prisma.shopping_mall_administrators.count({
      where: {
        grade: "super",
        deleted_at: null,
        id: { notIn: [caller.id, target.id] },
      },
    });
  if (otherSuperAdminCount === 0) {
    throw new HttpException("Cannot remove the last super administrator", 409);
  }
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_administrators.update({
      where: { id: props.administratorId },
      data: {
        grade: "regular",
        updated_at: new Date(),
      },
    });
    await tx.shopping_mall_administrator_grade_changes.create({
      data: {
        id: v4(),
        administrator_id: props.administratorId,
        performed_by_id: props.administrator.id,
        previous_grade: "super",
        new_grade: "regular",
        change_type: "demotion",
        created_at: new Date(),
      },
    });
    const updated = await tx.shopping_mall_administrators.findUniqueOrThrow({
      where: { id: props.administratorId },
      ...ShoppingMallAdministratorTransformer.select(),
    });
    return updated;
  });
  return await ShoppingMallAdministratorTransformer.transform(result);
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
// export async function postShoppingMallAdministratorAdministratorsAdministratorIdDemote(props: {
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