import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallChannelTransformer {
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
        shopping_mall_sections: true,
      },
    } satisfies Prisma.shopping_mall_channelsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallChannel> {
    return {
      name: input.name,
      description: input.description ?? "No description provided",
      salesType: "online", // Business assumption - field not in DB
      active: input.enabled,
    };
  }
}
