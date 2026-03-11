import { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallCustomerSessionAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_customer_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
        customer: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.ecommerce_mall_customer_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCustomerSession.ISummary> {
    const now = new Date();
    const sessionStatus: "active" | "invalidated" =
      input.expired_at > now ? "active" : "invalidated";
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
      ip: input.ip,
      href: input.href,
      referrer: input.referrer ?? undefined,
      sessionStatus: sessionStatus,
    };
  }
}
