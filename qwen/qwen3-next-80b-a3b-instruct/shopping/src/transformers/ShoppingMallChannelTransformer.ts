import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
        branding_logo_url: true,
        default_route: true,
        feature_flags: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.shopping_mall_channelsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallChannel> {
    return {
      id: input.id,
    };
  }
}
