import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallSellerTransformer {
  export type Payload = Prisma.ecommerce_mall_sellersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        shop_name: true,
        shop_description: true,
        logo_url: true,
        approval_status: true,
        is_suspended: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        password_hash: true,
        rejection_reason: true,
        sessions: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_admin_sessionsFindManyArgs,
        passwordResets: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_admin_password_resetsFindManyArgs,
        emailVerification: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_seller_email_verificationsFindManyArgs,
        shopProfile: {
          select: {
            id: true,
            logo_url: true,
            approval_status: true,
            rejection_reason: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        } satisfies Prisma.ecommerce_mall_shop_profilesFindManyArgs,
        profileSnapshots: {
          select: {
            id: true,
            created_at: true,
          },
        } satisfies Prisma.ecommerce_mall_shop_profile_snapshotsFindManyArgs,
        cancellationRequests: {
          select: {
            id: true,
            order_item_id: true,
            reason: true,
            status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        } satisfies Prisma.ecommerce_mall_cancellation_requestsFindManyArgs,
        refundRequests: {
          select: {
            id: true,
            order_item_id: true,
            reason: true,
            status: true,
            created_at: true,
            updated_at: true,
          },
        } satisfies Prisma.ecommerce_mall_refund_requestsFindManyArgs,
        cancellationRequestSnapshots: {
          select: {
            id: true,
            reason: true,
            status: true,
            created_at: true,
          },
        } satisfies Prisma.ecommerce_mall_cancellation_request_snapshotsFindManyArgs,
        sellerRegistration: {
          select: {
            id: true,
            shop_name: true,
            shop_description: true,
            logo_url: true,
            approval_status: true,
            rejection_reason: true,
          },
        } satisfies Prisma.ecommerce_mall_seller_registrationsFindManyArgs,
        suspensions: {
          select: {
            id: true,
            seller_id: true,
            reason: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        } satisfies Prisma.ecommerce_mall_seller_suspensionsFindManyArgs,
        orderOverrides: {
          select: {
            id: true,
            order_id: true,
            reason: true,
            created_at: true,
          },
        } satisfies Prisma.ecommerce_mall_order_overridesFindManyArgs,
        orderItems: {
          select: {
            id: true,
            order_id: true,
            quantity: true,
            created_at: true,
            updated_at: true,
          },
        } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs,
        shipments: {
          select: {
            id: true,
            tracking_number: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        } satisfies Prisma.ecommerce_mall_shipmentsFindManyArgs,
        products: {
          select: {
            id: true,
            seller_id: true,
            category_id: true,
            name: true,
            description: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        } satisfies Prisma.ecommerce_mall_productsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSeller> {
    return {
      id: input.id,
      email: input.email,
      shop_name: input.shop_name,
      shop_description: input.shop_description ?? undefined,
      logo_url: input.logo_url ?? undefined,
      approval_status: input.approval_status,
      is_suspended: input.is_suspended,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
