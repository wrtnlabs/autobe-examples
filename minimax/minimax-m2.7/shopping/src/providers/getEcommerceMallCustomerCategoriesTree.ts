import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCategoryAtTreeTransformer } from "../transformers/EcommerceMallCategoryAtTreeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerCategoriesTree(props: {
  customer: CustomerPayload;
}): Promise<IEcommerceMallCategory.ITree> {
  const records = await MyGlobal.prisma.ecommerce_mall_categories.findMany({
    ...EcommerceMallCategoryAtTreeTransformer.select(),
    where: {
      deleted_at: null,
      parent_id: null,
    },
    orderBy: { name: "asc" },
  });
  const tree: IEcommerceMallCategory.ITree = {
    id: "00000000-0000-0000-0000-000000000000" as string & tags.Format<"uuid">,
    name: "Root",
    description: undefined,
    children:
      await EcommerceMallCategoryAtTreeTransformer.transformAll(records),
  };
  return tree;
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallCustomerCategoriesTree(props: {
//   customer: CustomerPayload;
// }): Promise<IEcommerceMallCategory.ITree> {
//   const record = await MyGlobal.prisma.ecommerce_mall_categories.findFirstOrThrow({
//     ...EcommerceMallCategoryAtTreeTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallCategoryAtTreeTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------