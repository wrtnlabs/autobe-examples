import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallComplianceRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallComplianceRecord";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallComplianceRecordAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_compliance_recordsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        effective_from: true,
        effective_to: true,
        document_type: true,
        document_reference: true,
        document_url: true,
        jurisdiction: true,
        justification: true,
        admin: {
          select: {
            id: true,
          },
        },
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.shopping_mall_compliance_recordsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallComplianceRecord.ISummary> {
    // Map document_type to severityLevel based on business context
    let severityLevel: "low" | "medium" | "high" | "critical" = "high";
    if (
      input.document_type.includes("security") ||
      input.document_type.includes("breach")
    ) {
      severityLevel = "critical";
    } else if (
      input.document_type.includes("policy") ||
      input.document_type.includes("compliance")
    ) {
      severityLevel = "high";
    } else if (
      input.document_type.includes("access") ||
      input.document_type.includes("permission")
    ) {
      severityLevel = "medium";
    } else {
      severityLevel = "low";
    }
    return {
      id: input.id,
      eventTime: input.effective_from.toISOString(),
      eventActorId: input.admin.id,
      eventActorType: "admin",
      eventType: input.document_type,
      severityLevel,
      status: "active",
      auditCategory: input.jurisdiction,
      summary: input.justification,
      relatedEntityId: undefined,
      relatedEntityType: undefined,
      triggeredRule: input.document_reference,
      auditLogId: undefined,
      createdAt: input.created_at.toISOString(),
    };
  }
}
