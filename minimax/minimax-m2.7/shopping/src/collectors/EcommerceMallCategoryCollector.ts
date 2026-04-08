import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallCategoryCollector {
  export async function collect(props: {
    body: IEcommerceMallCategory.ICreate;
  }) {
    return {
      id: v4(),
      name: props.body.name,
      description: props.body.description ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      parent: props.body.parent_id
        ? { connect: { id: props.body.parent_id } }
        : undefined,
    } satisfies Prisma.ecommerce_mall_categoriesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallCategoryCollector {
//         export async function collect(props: {
//           body: IEcommerceMallCategory.ICreate;
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
//       parent: ...,
//       subcategories: ...,
//       products: ...,
//           } satisfies Prisma.ecommerce_mall_categoriesCreateInput;
//         }
//       }
//--------------------------------------------------------------