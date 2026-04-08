import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceSellerAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_sellersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        approval_status: true,
        is_suspended: true,
        is_banned: true,
        created_at: true,
        profile: {
          select: {
            shop_name: true,
            shop_description: true,
          },
        } satisfies Prisma.ecommerce_seller_profilesFindFirstArgs,
      },
    } satisfies Prisma.ecommerce_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceSeller.ISummary> {
    return {
      id: input.id,
      approval_status: input.approval_status,
      is_suspended: input.is_suspended,
      is_banned: input.is_banned,
      created_at: toISOStringSafe(input.created_at),
      shop_name: input.profile?.shop_name ?? "",
      shop_description: input.profile?.shop_description ?? "",
    } satisfies IEcommerceSeller.ISummary;
  }
}
