import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinition";
import { IErpHrmTimeTrackingReportDefinitionDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionDimension";
import { IErpHrmTimeTrackingReportDefinitionFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionFilter";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { ErpHrmTimeTrackingReportDefinitionDimensionCollector } from "./ErpHrmTimeTrackingReportDefinitionDimensionCollector";
import { ErpHrmTimeTrackingReportDefinitionFilterCollector } from "./ErpHrmTimeTrackingReportDefinitionFilterCollector";

export namespace ErpHrmTimeTrackingReportDefinitionCollector {
  export async function collect(props: {
    body: IErpHrmTimeTrackingReportDefinition.ICreate;
    organization: IEntity;
    creatorMember: IEntity;
  }) {
    const createdAt = new Date();
    return {
      id: v4(),
      code: props.body.code,
      name: props.body.name,
      description: props.body.description ?? null,
      report_type: props.body.report_type,
      is_active: props.body.is_active,
      created_at: createdAt,
      updated_at: createdAt,
      deleted_at: null,
      organization: { connect: { id: props.organization.id } },
      creatorMember: { connect: { id: props.creatorMember.id } },
      // Not created here
      reportGenerationRuns: undefined,
      definitionDimensions: props.body.definitionDimensions.length
        ? {
            create: await ArrayUtil.asyncMap(
              props.body.definitionDimensions,
              (dimension) =>
                ErpHrmTimeTrackingReportDefinitionDimensionCollector.collect({
                  body: dimension,
                  reportDefinition: undefined as unknown as IEntity,
                }),
            ),
          }
        : undefined,
      definitionFilters: props.body.definitionFilters.length
        ? {
            create: await ArrayUtil.asyncMap(
              props.body.definitionFilters,
              (filter) =>
                ErpHrmTimeTrackingReportDefinitionFilterCollector.collect({
                  body: filter,
                  reportDefinition: undefined as unknown as IEntity,
                }),
            ),
          }
        : undefined,
    } satisfies Prisma.erp_hrm_time_tracking_report_definitionsCreateInput;
  }
}
