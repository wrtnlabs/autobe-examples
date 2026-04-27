import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ECommerceMallCategoryCollector } from "../collectors/ECommerceMallCategoryCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ECommerceMallCategoryTransformer } from "../transformers/ECommerceMallCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postECommerceMallAdministratorCategories(props: {
  administrator: AdministratorPayload;
  body: IECommerceMallCategory.ICreate;
}): Promise<IECommerceMallCategory> {
  // Validate parent_id if provided: must reference an existing top-level category
  if (props.body.parent_id !== undefined && props.body.parent_id !== null) {
    await MyGlobal.prisma.e_commerce_mall_categories.findFirstOrThrow({
      where: {
        id: props.body.parent_id,
        parent_id: null,
        deleted_at: null,
      },
    });
  }
  const record = await MyGlobal.prisma.e_commerce_mall_categories.create({
    data: await ECommerceMallCategoryCollector.collect({
      body: props.body,
    }),
    ...ECommerceMallCategoryTransformer.select(),
  });
  return await ECommerceMallCategoryTransformer.transform(record);
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
// import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postECommerceMallAdministratorCategories(props: {
//   administrator: AdministratorPayload;
//   body: IECommerceMallCategory.ICreate;
// }): Promise<IECommerceMallCategory> {
//   const record = await MyGlobal.prisma.e_commerce_mall_categories.create({
//     data: await ECommerceMallCategoryCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ECommerceMallCategoryTransformer.select(),
//   });
//   return await ECommerceMallCategoryTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------