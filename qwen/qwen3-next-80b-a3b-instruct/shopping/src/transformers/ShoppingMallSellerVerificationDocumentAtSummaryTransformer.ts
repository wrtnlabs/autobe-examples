import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallSellerVerificationDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerVerificationDocument";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSellerVerificationDocumentAtSummaryTransformer {
  export type Payload =
    Prisma.shopping_mall_seller_verification_documentsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        document_type: true,
        status: true,
        uploaded_at: true,
        reviewed_at: true,
        review_notes: true,
        document_url: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: true,
        expiry_date: true,
        document_version: true,
        previous_version_id: true,
        reviewer_id: true,
      },
    } satisfies Prisma.shopping_mall_seller_verification_documentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSellerVerificationDocument.ISummary> {
    return {
      id: input.id,
      document_type: input.document_type,
      status: input.status,
      submission_date: toISOStringSafe(input.uploaded_at),
      review_status_date: input.reviewed_at
        ? toISOStringSafe(input.reviewed_at)
        : undefined,
      review_notes: input.review_notes ?? undefined,
      expiry_date: input.expiry_date
        ? toISOStringSafe(input.expiry_date)
        : new Date("2300-01-01").toISOString(),
      document_version: input.document_version ?? 0,
      previous_version_id: input.previous_version_id ?? undefined,
      reviewer_id: input.reviewer_id ?? undefined,
    };
  }
}
