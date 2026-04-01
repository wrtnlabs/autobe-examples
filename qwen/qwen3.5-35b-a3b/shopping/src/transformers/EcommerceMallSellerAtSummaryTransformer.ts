import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
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
        created_at: true,
        updated_at: true,
        deleted_at: true,
        approvalRequests: {
          select: { status: true, created_at: true },
        } satisfies Prisma.ecommerce_mall_seller_approval_requestsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSeller.ISummary> {
    // Compute status from approval requests: use latest or default to 'pending'
    const latestRequest =
      input.approvalRequests.length > 0
        ? input.approvalRequests.sort(
            (a, b) => b.created_at.getTime() - a.created_at.getTime(),
          )[0]
        : null;
    return {
      id: input.id,
      email: input.email,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      status: typia.assert<"pending" | "approved" | "rejected">(
        latestRequest?.status ?? "pending",
      ),
    };
  }
}
