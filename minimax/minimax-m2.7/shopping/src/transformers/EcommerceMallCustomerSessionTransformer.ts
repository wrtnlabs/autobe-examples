import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCustomerAtSummaryTransformer } from "./EcommerceMallCustomerAtSummaryTransformer";

export namespace EcommerceMallCustomerSessionTransformer {
  export type Payload = Prisma.ecommerce_mall_customer_sessionsGetPayload<
    ReturnType<typeof select>
  >;
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
        updated_at: true,
        expired_at: true,
        customer: EcommerceMallCustomerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_customer_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCustomerSession> {
    return {
      id: input.id,
      customer: await EcommerceMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      access_token: input.access_token,
      refresh_token: input.refresh_token,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
    };
  }
}
