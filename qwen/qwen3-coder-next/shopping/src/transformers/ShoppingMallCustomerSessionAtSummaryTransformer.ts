import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallCustomerSessionAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_customer_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        access_token: true,
        refresh_token: true,
        created_at: true,
        expired_at: true,
        ip: true,
        referrer: true,
        user_agent: true,
        customer: true,
        refundRequests: true,
      },
    } satisfies Prisma.shopping_mall_customer_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCustomerSession.ISummary> {
    return {
      id: input.id,
      access_token: input.access_token,
      refresh_token: input.refresh_token,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
      ip: input.ip,
      referrer: input.referrer ?? null,
      user_agent: input.user_agent ?? null,
    };
  }
}
