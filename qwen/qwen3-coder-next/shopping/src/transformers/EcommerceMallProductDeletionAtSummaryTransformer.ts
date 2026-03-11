import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductDeletion";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallAdminAtSummaryTransformer } from "./EcommerceMallAdminAtSummaryTransformer";
import { EcommerceMallProductAtSummaryTransformer } from "./EcommerceMallProductAtSummaryTransformer";

export namespace EcommerceMallProductDeletionAtSummaryTransformer {
  // 1. Payload type first
  export type Payload = Prisma.ecommerce_mall_product_deletionsGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        responded_at: true,
        approval_notes: true,
        deleted_at: true,
        created_at: true,
        updated_at: true,
        product: EcommerceMallProductAtSummaryTransformer.select(),
        admin: EcommerceMallAdminAtSummaryTransformer.select(),
        parentRequest: {
          select: {
            id: true,
            reason: true,
            status: true,
            responded_at: true,
            approval_notes: true,
            deleted_at: true,
            created_at: true,
            updated_at: true,
            admin: EcommerceMallAdminAtSummaryTransformer.select(),
            product: EcommerceMallProductAtSummaryTransformer.select(),
            parentRequest: {
              select: {
                id: true,
                reason: true,
                status: true,
                responded_at: true,
                approval_notes: true,
                deleted_at: true,
                created_at: true,
                updated_at: true,
                admin: EcommerceMallAdminAtSummaryTransformer.select(),
                product: EcommerceMallProductAtSummaryTransformer.select(),
              },
            } satisfies Prisma.ecommerce_mall_product_deletionsFindManyArgs,
          },
        } satisfies Prisma.ecommerce_mall_product_deletionsFindManyArgs,
        followUpRequests: {
          select: {
            id: true,
            reason: true,
            status: true,
            responded_at: true,
            approval_notes: true,
            deleted_at: true,
            created_at: true,
            updated_at: true,
            admin: EcommerceMallAdminAtSummaryTransformer.select(),
            product: EcommerceMallProductAtSummaryTransformer.select(),
          },
        } satisfies Prisma.ecommerce_mall_product_deletionsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_product_deletionsFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductDeletion.ISummary> {
    return {
      id: input.id,
      reason: input.reason,
      status: typia.assert<"pending" | "approved" | "rejected">(input.status),
      responded_at: input.responded_at
        ? toISOStringSafe(input.responded_at)
        : null,
      approval_notes: input.approval_notes ?? null,
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      product: await EcommerceMallProductAtSummaryTransformer.transform(
        input.product,
      ),
      admin: await EcommerceMallAdminAtSummaryTransformer.transform(
        input.admin,
      ),
      parentRequest: input.parentRequest
        ? await EcommerceMallProductDeletionAtSummaryTransformer.transform(
            input.parentRequest,
          )
        : null,
      followUpRequests: input.followUpRequests
        ? await ArrayUtil.asyncMap(
            input.followUpRequests,
            EcommerceMallProductDeletionAtSummaryTransformer.transform,
          )
        : [],
    };
  }
}
