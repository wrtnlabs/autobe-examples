import { IEcommerceCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceCustomerEmailVerificationAtSummaryTransformer {
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
            email: true,
          },
        } satisfies Prisma.ecommerce_customersFindManyArgs,
      },
    } satisfies Prisma.ecommerce_customer_email_verificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceCustomerEmailVerification.ISummary> {
    const now = new Date();
    const isVerified = input.verified_at !== null;
    const isExpired = !isVerified && input.expires_at < now;
    return {
      id: input.id,
      email: input.customer.email,
      expires_at: input.expires_at.toISOString(),
      status: isVerified ? "verified" : isExpired ? "expired" : "pending",
      user_type: "customer",
      created_at: input.created_at.toISOString(),
      verified_at: input.verified_at ? input.verified_at.toISOString() : null,
    } satisfies IEcommerceCustomerEmailVerification.ISummary;
  }
}
