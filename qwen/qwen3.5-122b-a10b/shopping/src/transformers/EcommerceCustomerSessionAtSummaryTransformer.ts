import { IEcommerceCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceCustomerSessionAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_customer_sessionsGetPayload<
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
      },
    } satisfies Prisma.ecommerce_customer_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceCustomerSession.ISummary> {
    return {
      id: input.id,
      ip: input.ip,
      href: input.href ?? null,
      referrer: input.referrer ?? null,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
    } satisfies IEcommerceCustomerSession.ISummary;
  }
}
