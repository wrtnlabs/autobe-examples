import { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallSellerRegistrationTransformer {
  export type Payload = Prisma.ecommerce_mall_seller_registrationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        user_id: true,
        shop_name: true,
        shop_description: true,
        logo_url: true,
        approval_status: true,
        rejection_reason: true,
        responded_at: true,
        seller: {
          select: {
            id: true,
            email: true,
          },
        } satisfies Prisma.ecommerce_mall_sellersFindManyArgs,
        bans: {
          select: {
            id: true,
            reason: true,
            banned_at: true,
          },
        } satisfies Prisma.ecommerce_mall_user_bansFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_seller_registrationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSellerRegistration> {
    return {
      id: input.id,
      user_id: input.user_id,
      shop_name: input.shop_name,
      shop_description: input.shop_description ?? undefined,
      logo_url: input.logo_url ?? undefined,
      approval_status: input.approval_status as
        | "pending"
        | "approved"
        | "rejected",
      rejection_reason: input.rejection_reason ?? undefined,
      responded_at: input.responded_at?.toISOString() ?? undefined,
    };
  }
}
