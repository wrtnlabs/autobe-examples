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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceMallCategoryTransformer } from "../transformers/EcommerceMallCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdministratorCategoriesCategoryId(props: {
  administrator: AdministratorPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IEcommerceMallCategory.IUpdate;
}): Promise<IEcommerceMallCategory> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_categories.findFirstOrThrow({
      ...EcommerceMallCategoryTransformer.select(),
      where: { id: props.categoryId },
    });
  if (record.deleted_at !== null) {
    throw new HttpException("Category not found", 404);
  }
  if (props.body.parent_id !== undefined && props.body.parent_id !== null) {
    const parent = await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
      where: {
        id: props.body.parent_id,
        deleted_at: null,
      },
      select: { id: true, parent_id: true },
    });
    if (parent === null) {
      throw new HttpException("Parent category not found", 404);
    }
    if (parent.parent_id !== null) {
      throw new HttpException("Parent must be a top-level category", 400);
    }
    if (parent.id === props.categoryId) {
      throw new HttpException("Category cannot be its own parent", 400);
    }
  }
  if (
    props.body.name !== undefined &&
    props.body.name !== null &&
    props.body.name !== ""
  ) {
    const existing = await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
      where: {
        name: props.body.name,
        parent_id: props.body.parent_id ?? null,
        deleted_at: null,
        NOT: { id: props.categoryId },
      },
      select: { id: true },
    });
    if (existing !== null) {
      throw new HttpException("Category name already exists", 400);
    }
  }
  const preUpdate =
    await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
    });
  const updateData: Prisma.ecommerce_mall_categoriesUpdateInput = {};
  if (props.body.name !== undefined) {
    updateData.name = props.body.name;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description ?? null;
  }
  if (props.body.sort_order !== undefined) {
    updateData.sort_order = props.body.sort_order ?? null;
  }
  if (props.body.parent_id !== undefined) {
    if (props.body.parent_id !== null) {
      updateData.parent = { connect: { id: props.body.parent_id } };
    } else {
      updateData.parent = { disconnect: true };
    }
  }
  updateData.updated_at = new Date();
  const updated = await MyGlobal.prisma.ecommerce_mall_categories.update({
    where: { id: props.categoryId },
    data: updateData,
    ...EcommerceMallCategoryTransformer.select(),
  });
  const snapshotData = JSON.stringify({
    before: {
      id: preUpdate.id,
      name: preUpdate.name,
      description: preUpdate.description,
      sort_order: preUpdate.sort_order,
      parent_id: preUpdate.parent_id,
      created_at: toISOStringSafe(preUpdate.created_at),
      updated_at: toISOStringSafe(preUpdate.updated_at),
    },
    after: {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      sort_order: updated.sort_order,
      parent_id: updated.parent?.id ?? null,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
    },
  });
  await MyGlobal.prisma.ecommerce_mall_snapshots.create({
    data: {
      id: v4(),
      category: { connect: { id: props.categoryId } },
      entity_type: "CATEGORY",
      action: "UPDATE",
      created_at: new Date(),
      updated_at: new Date(),
      metadata: snapshotData,
    },
  });
  return await EcommerceMallCategoryTransformer.transform(updated);
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
// export async function patchEcommerceMallAdministratorCategoriesCategoryId(props: {
//   administrator: AdministratorPayload;
//   categoryId: string & tags.Format<"uuid">;
//   body: IEcommerceMallCategory.IUpdate;
// }): Promise<IEcommerceMallCategory> {
//   const record = await MyGlobal.prisma.ecommerce_mall_categories.findFirstOrThrow({
//     ...EcommerceMallCategoryTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallCategoryTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------