import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallCategoryAtTreeTransformer {
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        parent: {
          select: {
            id: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            description: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            parent: {
              select: {
                id: true,
              },
            },
            children: {
              select: {
                id: true,
                name: true,
                description: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                parent: {
                  select: {
                    id: true,
                  },
                },
                children: {
                  select: {
                    id: true,
                  },
                },
                snapshots: {
                  select: {
                    id: true,
                  },
                },
                products: {
                  select: {
                    id: true,
                  },
                },
                productSnapshots: {
                  select: {
                    id: true,
                  },
                },
              },
            },
            snapshots: {
              select: {
                id: true,
              },
            },
            products: {
              select: {
                id: true,
              },
            },
            productSnapshots: {
              select: {
                id: true,
              },
            },
          },
        },
        snapshots: {
          select: {
            id: true,
          },
        },
        products: {
          select: {
            id: true,
          },
        },
        productSnapshots: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_categoriesFindManyArgs;
  }
  export type Payload = Prisma.shopping_mall_categoriesGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCategory.ITree> {
    return {
      id: input.id,
      parent_id: input.parent?.id ?? null,
      name: input.name,
      description: input.description,
      children: await ArrayUtil.asyncMap(
        input.children,
        ShoppingMallCategoryAtTreeTransformer.transform,
      ),
    };
  }
}
