import { IEcommerceMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallSellerPasswordResetAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_seller_password_resetsGetPayload<{
    select: {
      id: true;
      reset_token: true;
      expired_at: true;
      created_at: true;
      seller: {
        select: {
          email: true;
        };
      };
    };
  }>;
  export function select() {
    return {
      select: {
        id: true,
        reset_token: true,
        expired_at: true,
        created_at: true,
        seller: {
          select: {
            email: true,
          },
        },
      },
    } satisfies Prisma.ecommerce_mall_seller_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSellerPasswordReset.ISummary> {
    return {
      id: input.id,
      email: input.seller.email,
      expired_at: input.expired_at.toISOString(),
      created_at: input.created_at.toISOString(),
    };
  }
}
