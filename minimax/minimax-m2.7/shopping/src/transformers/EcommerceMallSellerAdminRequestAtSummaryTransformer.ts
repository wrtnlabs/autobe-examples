import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerAdminRequest";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

export namespace EcommerceMallSellerAdminRequestAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_seller_admin_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
        reviewedBySuperAdmin: true,
      },
    } satisfies Prisma.ecommerce_mall_seller_admin_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSellerAdminRequest.ISummary> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      reason: input.reason,
      status: input.status,
      rejection_reason: input.rejection_reason ?? undefined,
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
    };
  }
}
