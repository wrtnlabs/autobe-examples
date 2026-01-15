import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallChannelAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_channelsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        logo_url: true,
        color_scheme: true,
        theme: true,
        timezone: true,
        currency: true,
        language: true,
        enabled: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        _count: {
          select: {
            shopping_mall_sections: true,
            shopping_mall_channels: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_channelsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallChannel.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? undefined,
      parentId: undefined,
      status: input.deleted_at
        ? "archived"
        : input.enabled
          ? "active"
          : "inactive",
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      productCount: 0,
      sectionCount: input._count.shopping_mall_sections,
      childrenCount: input._count.shopping_mall_channels,
    };
  }
}
