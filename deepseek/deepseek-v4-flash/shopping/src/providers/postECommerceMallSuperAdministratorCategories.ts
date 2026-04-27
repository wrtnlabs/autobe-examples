import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { ECommerceMallCategoryTransformer } from "../transformers/ECommerceMallCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postECommerceMallSuperAdministratorCategories(props: {
  superAdministrator: SuperadministratorPayload;
  body: IECommerceMallCategory.ICreate;
}): Promise<IECommerceMallCategory> {
  // Validate parent_id if provided: must reference an existing top-level category
  if (props.body.parent_id != null) {
    const parent = await MyGlobal.prisma.e_commerce_mall_categories.findFirst({
      where: {
        id: props.body.parent_id,
        parent_id: null,
        deleted_at: null,
      },
    });
    if (parent === null) {
      throw new HttpException(
        "Parent category not found or is not a top-level category",
        422,
      );
    }
  }
  const record = await MyGlobal.prisma.e_commerce_mall_categories.create({
    data: {
      id: v4(),
      name: props.body.name,
      description: props.body.description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      parent: props.body.parent_id
        ? { connect: { id: props.body.parent_id } }
        : undefined,
    },
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
// export async function postECommerceMallSuperAdministratorCategories(props: {
//   superAdministrator: SuperadministratorPayload;
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