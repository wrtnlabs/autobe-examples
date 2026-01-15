import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallComplianceRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallComplianceRecord";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallComplianceRecordTransformer {
  export type Payload = Prisma.shopping_mall_compliance_recordsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        jurisdiction: true,
        document_type: true,
        document_reference: true,
        effective_from: true,
        effective_to: true,
        document_url: true,
        justification: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        admin: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_compliance_recordsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallComplianceRecord> {
    return {
      id: input.id,
      purpose: input.jurisdiction,
      findings:
        input.document_type +
        "\n\n" +
        input.document_reference +
        "\n\n" +
        input.justification,
      status: input.deleted_at
        ? "archived"
        : input.effective_to
          ? "corrected"
          : input.effective_from
            ? "violated"
            : "pending_review",
      related_documentation: input.document_url
        ? [input.document_url]
        : undefined,
      created_at: input.effective_from
        ? input.effective_from.toISOString()
        : input.created_at.toISOString(),
      updated_at: input.updated_at
        ? input.updated_at.toISOString()
        : input.effective_to
          ? input.effective_to.toISOString()
          : undefined,
      created_by: input.admin.id,
      updated_by: input.updated_at ? input.admin.id : undefined,
    };
  }
}
