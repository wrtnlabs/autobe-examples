import { IEcommerceMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallCustomerPasswordResetTransformer {
  export type Payload =
    Prisma.ecommerce_mall_customer_password_resetsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        expires_at: true,
        created_at: true,
      },
    } satisfies Prisma.ecommerce_mall_customer_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCustomerPasswordReset> {
    return {
      id: input.id,
      token: input.token,
      expiresAt: input.expires_at.toISOString(),
      createdAt: input.created_at.toISOString(),
    };
  }
}
