import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallSellerAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_sellersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        approval_status: true,
        rejection_reason: true,
        is_suspended: true,
        is_banned: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: true,
        passwordReset: true,
        emailVerifications: true,
        shipments: true,
        orderItemStatusSnapshots: true,
        adminRequest: true,
        products: true,
        productSnapshots: true,
      },
    } satisfies Prisma.ecommerce_mall_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSeller.ISummary> {
    return {
      id: input.id,
      email: input.email,
      approval_status: typia.assert<"pending" | "approved" | "rejected">(
        input.approval_status,
      ),
      rejection_reason: input.rejection_reason ?? undefined,
      is_suspended: input.is_suspended,
      is_banned: input.is_banned,
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
