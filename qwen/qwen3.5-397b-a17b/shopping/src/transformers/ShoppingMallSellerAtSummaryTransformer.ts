import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSellerAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_sellersGetPayload<
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
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_seller_sessionsFindManyArgs,
        passwordResets: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_seller_password_resetsFindManyArgs,
        emailVerifications: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_seller_email_verificationsFindManyArgs,
        profile: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_seller_profilesFindManyArgs,
        approvalRequests: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_seller_approval_requestsFindManyArgs,
        adminPromotionRequests: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_admin_promotion_request_of_sellersFindManyArgs,
        products: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_productsFindManyArgs,
        orderItems: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_order_itemsFindManyArgs,
        shipments: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_shipmentsFindManyArgs,
        cancellationRequests: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_post_purchase_cancellation_requestsFindManyArgs,
        cancellationRequestSnapshots: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_post_purchase_cancellation_request_snapshotsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSeller.ISummary> {
    return {
      id: input.id,
      email: input.email,
      approvalStatus: input.approval_status,
      rejectionReason: input.rejection_reason ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    } satisfies IShoppingMallSeller.ISummary;
  }
}
