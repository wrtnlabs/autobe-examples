import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import { IErpHrmTimeTrackingReportDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinition";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmTimeTrackingMemberAtSummaryTransformer } from "./ErpHrmTimeTrackingMemberAtSummaryTransformer";

export namespace ErpHrmTimeTrackingReportDefinitionAtSummaryTransformer {
  export type Payload =
    Prisma.erp_hrm_time_tracking_report_definitionsGetPayload<
      ReturnType<typeof select>
    >;
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTrackingReportDefinition.ISummary> {
    return {
      id: input.id,
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      report_type: input.report_type,
      is_active: input.is_active,
      organization: {},
      creatorMember:
        await ErpHrmTimeTrackingMemberAtSummaryTransformer.transform(
          input.creatorMember,
        ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
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
        organization: { select: {} },
        creatorMember: ErpHrmTimeTrackingMemberAtSummaryTransformer.select(),
        reportGenerationRuns: {
          select: {},
        } satisfies Prisma.erp_hrm_time_tracking_report_generation_runsFindManyArgs,
        definitionDimensions: {
          select: {},
        } satisfies Prisma.erp_hrm_time_tracking_report_definition_dimensionsFindManyArgs,
        definitionFilters: {
          select: {},
        } satisfies Prisma.erp_hrm_time_tracking_report_definition_filtersFindManyArgs,
      },
    } satisfies Prisma.erp_hrm_time_tracking_report_definitionsFindManyArgs;
  }
}
