import { IEcommerceCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceCustomerPasswordResetTransformer {
  export type Payload = Prisma.ecommerce_customer_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        customer: {
          select: {
            id: true,
          },
        },
        token: true,
        expires_at: true,
        used_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.ecommerce_customer_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceCustomerPasswordReset> {
    return {
      id: input.id,
      ecommerce_customer_id: input.customer.id,
      token: input.token,
      expires_at: input.expires_at.toISOString(),
      used_at: input.used_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceCustomerPasswordReset;
  }
}
