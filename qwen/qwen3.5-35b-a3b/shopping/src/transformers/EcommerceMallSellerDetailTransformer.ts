import { IEcommerceMallSellerDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerDetail";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallSellerDetailTransformer {
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
  ): Promise<IEcommerceMallSellerDetail> {
    return {
      id: input.id,
      email: input.email,
      approvalStatus: typia.assert<"pending" | "approved" | "rejected">(
        input.approval_status,
      ),
      rejectionReason: input.rejection_reason ?? undefined,
      isSuspended: input.is_suspended,
      isBanned: input.is_banned,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
