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
        created_at: true,
        approvalRequests: {
          select: {
            status: true,
            submitted_at: true,
          },
        } satisfies Prisma.shopping_mall_seller_approval_requestsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSeller.ISummary> {
    const latestApproval = input.approvalRequests.sort(
      (a, b) => b.submitted_at.getTime() - a.submitted_at.getTime(),
    )[0];
    return {
      id: input.id,
      email: input.email,
      created_at: input.created_at.toISOString(),
      approval_status: (latestApproval?.status ??
        "pending") as IShoppingMallSeller.ISummary["approval_status"],
    };
  }
}
