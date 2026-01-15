import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallUserFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserFlag";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallUserFlagTransformer {
  export type Payload = Prisma.shopping_mall_user_flagsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        actor_type: true,
        flag_type: true,
        description: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        flagger: true,
        flaggedCustomer: true,
        flaggedSeller: true,
      },
    } satisfies Prisma.shopping_mall_user_flagsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallUserFlag> {
    return {
      id: input.id,
      user_id:
        input.actor_type === "customer"
          ? (input.flaggedCustomer?.id ??
            "00000000-0000-0000-0000-000000000000")
          : (input.flaggedSeller?.id ?? "00000000-0000-0000-0000-000000000000"),
      flag_key: input.flag_type as
        | "suspicious_activity"
        | "policy_violation"
        | "account_alert",
      description: input.description,
      created_at: input.created_at.toISOString(),
      status: input.status as "active" | "resolved" | "archived",
    };
  }
}
