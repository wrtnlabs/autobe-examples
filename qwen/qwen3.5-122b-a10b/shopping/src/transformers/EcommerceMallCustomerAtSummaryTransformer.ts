import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallCustomerAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_customersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        display_name: true,
        phone_number: true,
        account_status: true,
        created_at: true,
      },
    } satisfies Prisma.ecommerce_mall_customersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCustomer.ISummary> {
    return {
      id: input.id,
      email: input.email,
      display_name: input.display_name ?? null,
      phone_number: input.phone_number ?? null,
      account_status: typia.assert<"active" | "suspended" | "banned">(
        input.account_status,
      ),
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
