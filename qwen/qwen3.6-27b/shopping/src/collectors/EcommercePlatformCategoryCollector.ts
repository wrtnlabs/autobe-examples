import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommercePlatformCategoryCollector {
  export async function collect(props: {
    body: IEcommercePlatformCategory.ICreate;
  }) {
    return {
      id: v4(),
      name: props.body.name,
      description: props.body.description,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      parentCategory: props.body.parentEcommercePlatformCategoryId
        ? { connect: { id: props.body.parentEcommercePlatformCategoryId } }
        : undefined,
    } satisfies Prisma.ecommerce_platform_categoriesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommercePlatformCategoryCollector {
//         export async function collect(props: {
//           body: IEcommercePlatformCategory.ICreate;
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
//       childrenCategories: ...,
//       products: ...,
//           } satisfies Prisma.ecommerce_platform_categoriesCreateInput;
//         }
//       }
//--------------------------------------------------------------