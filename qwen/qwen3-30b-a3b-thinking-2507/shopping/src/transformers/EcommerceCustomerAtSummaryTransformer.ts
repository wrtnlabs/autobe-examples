import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

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
        password_hash: true,
        email_verified: true,
        is_suspended: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: true,
        emailVerifications: true,
        passwordResets: true,
        activitySnapshots: true,
        orders: true,
        refundRequests: true,
        profile: true,
        addresses: true,
        cartItems: true,
      },
    } satisfies Prisma.ecommerce_customersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceCustomer.ISummary> {
    return {
      id: input.id,
      email: input.email,
      emailVerified: input.email_verified,
      isSuspended: input.is_suspended,
      createdAt: input.created_at.toISOString(),
    };
  }
}
