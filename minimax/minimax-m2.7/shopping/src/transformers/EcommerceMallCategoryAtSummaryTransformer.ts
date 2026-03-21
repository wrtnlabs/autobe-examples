import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallCategoryAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_categoriesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        parent: {
          select: {
            id: true,
            name: true,
            description: true,
            parent: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCategory.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? undefined,
      parent: input.parent
        ? {
            id: input.parent.id,
            name: input.parent.name,
            description: input.parent.description ?? undefined,
            parent: input.parent.parent
              ? {
                  id: input.parent.parent.id,
                  name: input.parent.parent.name,
                  description: input.parent.parent.description ?? undefined,
                }
              : undefined,
          }
        : undefined,
    };
  }
}
