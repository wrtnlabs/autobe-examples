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
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: true,
        passwordResets: true,
        emailVerifications: true,
        orders: true,
        orderSnapshots: true,
        reviews: true,
        reviewHelpfulnessVotes: true,
        reviewSnapshots: true,
        customerActivityLogs: true,
        notificationReferences: true,
        addresses: true,
        addressSnapshots: true,
        wishlistItems: true,
        generatedSnapshots: true,
        cancellationRequests: true,
        refundRequests: true,
        refundRequestCustomerSnapshots: true,
      },
    } satisfies Prisma.ecommerce_mall_customersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCustomer.ISummary> {
    return {
      id: input.id,
      email: input.email,
      status: input.status,
      created_at: input.created_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
