import { IEcommerceMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallSellerPasswordResetAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_seller_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        seller: {
          select: {
            id: true,
          },
        },
        token: true,
        expires_at: true,
        created_at: true,
      },
    } satisfies Prisma.ecommerce_mall_seller_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSellerPasswordReset.ISummary> {
    return {
      id: input.id,
      sellerId: input.seller.id,
      token: input.token,
      expiresAt: input.expires_at.toISOString(),
      createdAt: input.created_at.toISOString(),
    };
  }
}
