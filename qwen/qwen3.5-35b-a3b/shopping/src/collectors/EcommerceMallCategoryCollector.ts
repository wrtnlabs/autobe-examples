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
    ecommerceMallAdministrators: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      description: props.body.description ?? null,
      sort_order: props.body.sort_order ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      parent: props.body.parent_id
        ? { connect: { id: props.body.parent_id } }
        : undefined,
      creator: {
        connect: { id: props.ecommerceMallAdministrators.id },
      },
      products: undefined,
      children: undefined,
      ecommerceMallCategoriesSnapshotss: undefined,
      productSnapshots: undefined,
      ecommerceMallCategorySnapshots: undefined,
      childCategories: undefined,
    } satisfies Prisma.ecommerce_mall_categoriesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallCategoryCollector {
//         export async function collect(props: {
//           body: IEcommerceMallCategory.ICreate;
//           ecommerceMallAdministrators: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       name: ...,
//       description: ...,
//       sort_order: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       parent: ...,
//       creator: ...,
//       products: ...,
//       children: ...,
//       ecommerceMallCategoriesSnapshotss: ...,
//       productSnapshots: ...,
//       ecommerceMallCategorySnapshots: ...,
//       childCategories: ...,
//           } satisfies Prisma.ecommerce_mall_categoriesCreateInput;
//         }
//       }
//--------------------------------------------------------------