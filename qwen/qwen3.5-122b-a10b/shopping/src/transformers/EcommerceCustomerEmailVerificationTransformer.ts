import { IEcommerceCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceCustomerEmailVerificationTransformer {
  export type Payload = Prisma.ecommerce_customer_email_verificationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        expires_at: true,
        verified_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_customersFindManyArgs,
      },
    } satisfies Prisma.ecommerce_customer_email_verificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceCustomerEmailVerification> {
    return {
      id: input.id,
      ecommerce_customer_id: input.customer.id,
      expires_at: input.expires_at.toISOString(),
      verified_at: input.verified_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceCustomerEmailVerification;
  }
}
