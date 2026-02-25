import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceCustomerTransformer {
  export type Payload = Prisma.ecommerce_customersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        email_verified: true,
        is_suspended: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        password_hash: true,
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
  export async function transform(input: Payload): Promise<IEcommerceCustomer> {
    return {
      id: input.id,
      email: input.email,
      email_verified: input.email_verified,
      is_suspended: input.is_suspended,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
