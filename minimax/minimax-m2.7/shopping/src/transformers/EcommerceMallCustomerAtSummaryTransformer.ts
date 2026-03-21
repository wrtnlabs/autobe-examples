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
        password_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: true,
        passwordResets: true,
        emailVerifications: true,
        adminRequest: true,
        profile: {
          select: {
            display_name: true,
          },
        } satisfies Prisma.ecommerce_mall_customer_profilesFindManyArgs,
        shippingAddresses: true,
        cart: true,
        wishlist: true,
        orders: true,
        cancellationRequests: true,
        refundRequests: true,
        refundRequestSnapshots: true,
        reviews: true,
      },
    } satisfies Prisma.ecommerce_mall_customersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCustomer.ISummary> {
    return {
      id: input.id,
      email: input.email,
      created_at: input.created_at.toISOString(),
      display_name: input.profile?.display_name ?? null,
      status: input.deleted_at ? "deleted" : "active",
    };
  }
}
