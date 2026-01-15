import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallUserFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserFlag";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ShoppingMallUserFlagAtResponseItemTransformer } from "./ShoppingMallUserFlagAtResponseItemTransformer";

export namespace ShoppingMallUserFlagAtResponseTransformer {
  export type Payload = Prisma.shopping_mall_user_flagsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        flag_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        actor_type: true,
        description: true,
        status: true,
        flagger: true,
        flaggedCustomer: true,
        flaggedSeller: true,
      },
    } satisfies Prisma.shopping_mall_user_flagsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallUserFlag.IResponse> {
    return {
      success: true,
      updatedFlags: [
        await ShoppingMallUserFlagAtResponseItemTransformer.transform(input),
      ],
      warnings: undefined,
    };
  }
}
