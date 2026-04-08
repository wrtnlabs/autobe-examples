import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MallPlatformCategoryCollector {
  export async function collect(props: {
    body: IMallPlatformCategory.ICreate;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      name: props.body.name,
      description: props.body.description,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      parentCategory: props.body.parentCategoryId
        ? { connect: { id: props.body.parentCategoryId } }
        : undefined,
    } satisfies Prisma.mall_platform_categoriesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace MallPlatformCategoryCollector {
//         export async function collect(props: {
//           body: IMallPlatformCategory.ICreate;
//           
//           
//           
//         }) {
//           return {
//       id: ...,
//       name: ...,
//       description: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       parentCategory: ...,
//       products: ...,
//       subcategories: ...,
//           } satisfies Prisma.mall_platform_categoriesCreateInput;
//         }
//       }
//--------------------------------------------------------------