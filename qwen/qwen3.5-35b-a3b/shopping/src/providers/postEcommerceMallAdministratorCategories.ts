import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallCategoryCollector } from "../collectors/EcommerceMallCategoryCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceMallCategoryTransformer } from "../transformers/EcommerceMallCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdministratorCategories(props: {
  administrator: AdministratorPayload;
  body: IEcommerceMallCategory.ICreate;
}): Promise<IEcommerceMallCategory> {
  if (props.body.name.length === 0) {
    throw new HttpException("Name is required", 400);
  }
  if (
    props.body.description === undefined ||
    props.body.description === null ||
    props.body.description.length === 0
  ) {
    throw new HttpException("Description is required", 400);
  }
  if (props.body.parent_id !== undefined && props.body.parent_id !== null) {
    const parentCategory =
      await MyGlobal.prisma.ecommerce_mall_categories.findUnique({
        where: { id: props.body.parent_id },
      });
    if (parentCategory === null) {
      throw new HttpException("Parent category not found", 404);
    }
    if (parentCategory.parent_id !== null) {
      throw new HttpException("Parent category cannot have a parent", 400);
    }
  }
  const record = await MyGlobal.prisma.ecommerce_mall_categories.create({
    data: await EcommerceMallCategoryCollector.collect({
      body: props.body,
      ecommerceMallAdministrators: {
        id: props.administrator.id,
      },
    }),
    ...EcommerceMallCategoryTransformer.select(),
  });
  return await EcommerceMallCategoryTransformer.transform(record);
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
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallAdministratorCategories(props: {
//   administrator: AdministratorPayload;
//   body: IEcommerceMallCategory.ICreate;
// }): Promise<IEcommerceMallCategory> {
//   const record = await MyGlobal.prisma.ecommerce_mall_categories.create({
//     data: await EcommerceMallCategoryCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallCategoryTransformer.select(),
//   });
//   return await EcommerceMallCategoryTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------