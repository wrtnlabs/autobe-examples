import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceCustomerAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_customersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        display_name: true,
        phone_number: true,
        created_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.ecommerce_customersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceCustomer.ISummary> {
    return {
      id: input.id,
      email: input.email,
      display_name: input.display_name,
      phone_number: input.phone_number,
      created_at: input.created_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceCustomer.ISummary;
  }
}
