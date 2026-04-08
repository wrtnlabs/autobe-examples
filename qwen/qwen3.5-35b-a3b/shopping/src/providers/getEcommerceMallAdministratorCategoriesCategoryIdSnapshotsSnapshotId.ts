import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEcommerceMallCategoriesSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategoriesSnapshot";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceMallCategoriesSnapshotTransformer } from "../transformers/EcommerceMallCategoriesSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdministratorCategoriesCategoryIdSnapshotsSnapshotId(props: {
  administrator: AdministratorPayload;
  categoryId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallCategoriesSnapshot> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_categories_snapshots.findFirstOrThrow({
      ...EcommerceMallCategoriesSnapshotTransformer.select(),
      where: {
        id: props.snapshotId,
        category_id: props.categoryId,
        entity_type: "category",
      },
    });
  return await EcommerceMallCategoriesSnapshotTransformer.transform(record);
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
// import { IEcommerceMallCategoriesSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategoriesSnapshot";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallAdministratorCategoriesCategoryIdSnapshotsSnapshotId(props: {
//   administrator: AdministratorPayload;
//   categoryId: string & tags.Format<"uuid">;
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallCategoriesSnapshot> {
//   const record = await MyGlobal.prisma.ecommerce_mall_categories_snapshots.findFirstOrThrow({
//     ...EcommerceMallCategoriesSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallCategoriesSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------