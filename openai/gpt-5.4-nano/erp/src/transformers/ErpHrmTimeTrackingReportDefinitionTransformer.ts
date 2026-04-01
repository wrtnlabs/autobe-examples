import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinition";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimeTrackingReportDefinitionTransformer {
  export type Payload =
    Prisma.erp_hrm_time_tracking_report_definitionsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        report_type: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: {
          select: { id: true },
        },
        creatorMember: {
          select: { id: true },
        },
        // Selected to satisfy payload typing and allow derived booleans.
        reportGenerationRuns: true,
        definitionDimensions: true,
        definitionFilters: true,
      },
    } satisfies Prisma.erp_hrm_time_tracking_report_definitionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTrackingReportDefinition> {
    return {
      id: input.id,
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      report_type: input.report_type,
      is_active: input.is_active,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
      organization_id: input.organization.id,
      creator_member_id: input.creatorMember.id,
      dimensions: input.definitionDimensions.length > 0,
      filters: input.definitionFilters.length > 0,
    };
  }
}
