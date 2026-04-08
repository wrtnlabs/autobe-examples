import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceCustomerAtSummaryTransformer } from "./EcommerceCustomerAtSummaryTransformer";

export namespace EcommerceCustomerPasswordResetAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_customer_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        expires_at: true,
        used_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: EcommerceCustomerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_customer_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceCustomerPasswordReset.ISummary> {
    return {
      id: input.id,
      customer: await EcommerceCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      expires_at: input.expires_at.toISOString(),
      used_at: input.used_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceCustomerPasswordReset.ISummary;
  }
}
