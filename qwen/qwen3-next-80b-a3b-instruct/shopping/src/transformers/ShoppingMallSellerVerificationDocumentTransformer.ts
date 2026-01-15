import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallSellerVerificationDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerVerificationDocument";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSellerVerificationDocumentTransformer {
  export type Payload =
    Prisma.shopping_mall_seller_verification_documentsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        document_type: true,
        document_url: true,
        status: true,
        uploaded_at: true,
        reviewed_at: true,
        review_notes: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_seller_verification_documentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSellerVerificationDocument> {
    return {
      id: input.id,
      seller_id: input.seller.id,
      document_type: input.document_type as
        | "business_license"
        | "id_card"
        | "tax_id"
        | "bank_account",
      file_uri: input.document_url,
      uploaded_at: input.uploaded_at.toISOString(),
      status: input.status as "pending" | "approved" | "rejected" | "expired",
      admin_comments: input.review_notes ?? undefined,
      verification_expires_at: input.reviewed_at?.toISOString() ?? undefined,
    };
  }
}
