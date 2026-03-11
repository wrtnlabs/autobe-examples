import { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallSellerRegistrationAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_seller_registrationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        shop_name: true,
        approval_status: true,
        // Required by validation but not used in ISummary DTO
        shop_description: true,
        logo_url: true,
        rejection_reason: true,
        responded_at: true,
        seller: {
          select: {
            id: true,
            email: true,
            created_at: true,
          },
        } satisfies Prisma.ecommerce_mall_sellersFindManyArgs,
        bans: {
          select: {
            id: true,
            banned_at: true,
            reason: true,
          },
        } satisfies Prisma.ecommerce_mall_user_bansFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_seller_registrationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSellerRegistration.ISummary> {
    return {
      id: input.id,
      shop_name: input.shop_name,
      approval_status: input.approval_status,
    };
  }
}
