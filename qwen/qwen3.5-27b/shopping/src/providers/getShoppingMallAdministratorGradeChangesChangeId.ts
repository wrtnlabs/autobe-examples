import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGradeChange";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallAdministratorGradeChangeTransformer } from "../transformers/ShoppingMallAdministratorGradeChangeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorGradeChangesChangeId(props: {
  administrator: AdministratorPayload;
  changeId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdministratorGradeChange> {
  const record =
    await MyGlobal.prisma.shopping_mall_administrator_grade_changes.findFirstOrThrow(
      {
        ...ShoppingMallAdministratorGradeChangeTransformer.select(),
        where: {
          id: props.changeId,
        },
      },
    );
  return await ShoppingMallAdministratorGradeChangeTransformer.transform(
    record,
  );
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
// import { IShoppingMallAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGradeChange";
// import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getShoppingMallAdministratorGradeChangesChangeId(props: {
//   administrator: AdministratorPayload;
//   changeId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallAdministratorGradeChange> {
//   const record = await MyGlobal.prisma.shopping_mall_administrator_grade_changes.findFirstOrThrow({
//     ...ShoppingMallAdministratorGradeChangeTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallAdministratorGradeChangeTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------