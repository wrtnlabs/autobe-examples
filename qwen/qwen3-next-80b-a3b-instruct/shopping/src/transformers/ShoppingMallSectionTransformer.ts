import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSectionTransformer {
  export type Payload = Prisma.shopping_mall_sectionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        ordering: true,
        channel: {
          select: {
            id: true,
          },
        },
        parent: {
          select: {
            id: true,
          },
        },
        recursive: {
          select: {
            id: true,
          },
        },
        createdAt: true,
      },
    } satisfies Prisma.shopping_mall_sectionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSection> {
    return {
      id: input.id,
      name: input.name,
      code: input.parent?.id || input.id,
      description: input.description ?? undefined,
      displayOrder: input.ordering,
      isActive: false,
      bannerImage: undefined,
      secondaryImage: undefined,
      metaTitle: undefined,
      metaDescription: undefined,
      sectionType: undefined,
      parentSectionCode: input.parent?.id ?? undefined,
      createdAt: toISOStringSafe(input.createdAt),
    };
  }
}
