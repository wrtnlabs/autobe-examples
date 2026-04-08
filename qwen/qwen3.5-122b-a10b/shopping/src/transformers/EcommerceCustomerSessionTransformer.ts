import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceCustomerAtSummaryTransformer } from "./EcommerceCustomerAtSummaryTransformer";

export namespace EcommerceCustomerSessionTransformer {
  export type Payload = Prisma.ecommerce_customer_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceCustomerSession> {
    return {
      id: input.id,
      ip: input.ip,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
      href: input.href ?? undefined,
      referrer: input.referrer ?? undefined,
      customer: await EcommerceCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
    } satisfies IEcommerceCustomerSession;
  }
  export function select() {
    return {
      select: {
        id: true,
        access_token: true,
        refresh_token: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
        customer: EcommerceCustomerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_customer_sessionsFindManyArgs;
  }
}
