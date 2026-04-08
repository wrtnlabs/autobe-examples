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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallCategoryTransformer } from "../transformers/EcommerceMallCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSuperAdminAdminCategories(props: {
  superAdmin: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "super_admin";
  };
  body: IEcommerceMallCategory.ICreate;
}): Promise<IEcommerceMallCategory> {
  // Validate parent_id if provided
  if (props.body.parent_id) {
    // Verify parent category exists and is not soft-deleted
    const parent = await MyGlobal.prisma.ecommerce_mall_categories.findUnique({
      where: { id: props.body.parent_id },
      select: { id: true, parent_id: true, deleted_at: true },
    });
    if (parent === null) {
      throw new HttpException("Parent category not found", 404);
    }
    if (parent.deleted_at !== null) {
      throw new HttpException("Parent category is deleted", 400);
    }
    // Enforce one level of nesting - parent must be a top-level category
    if (parent.parent_id !== null) {
      throw new HttpException(
        "Subcategories cannot have children. Only one level of nesting is allowed.",
        400,
      );
    }
    // Check unique constraint: no existing category with same name under the same parent
    const existing = await MyGlobal.prisma.ecommerce_mall_categories.findUnique(
      {
        where: {
          parent_id_name: {
            parent_id: props.body.parent_id,
            name: props.body.name,
          },
        },
        select: { id: true },
      },
    );
    if (existing !== null) {
      throw new HttpException(
        "A category with this name already exists under the same parent",
        409,
      );
    }
  } else {
    // Top-level category: check unique constraint for name at top level (parent_id = null)
    const existingTopLevelCount =
      await MyGlobal.prisma.ecommerce_mall_categories.count({
        where: {
          parent_id: null,
          name: props.body.name,
        },
      });
    if (existingTopLevelCount > 0) {
      throw new HttpException(
        "A top-level category with this name already exists",
        409,
      );
    }
  }
  // Create category using collector for data preparation
  const record = await MyGlobal.prisma.ecommerce_mall_categories.create({
    data: await EcommerceMallCategoryCollector.collect({
      body: props.body,
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallSuperAdminAdminCategories(props: {
//   superAdmin: SuperadminPayload;
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