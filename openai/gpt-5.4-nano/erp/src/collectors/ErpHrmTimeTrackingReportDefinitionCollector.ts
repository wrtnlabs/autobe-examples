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

const toISOStringSafe = (value: unknown) => {
  const fn = (
    MyGlobal as unknown as {
      toISOStringSafe?: (d: unknown) => string;
    }
  ).toISOStringSafe;
  if (fn) return fn(value);
  return (
    value as {
      toISOString: () => string;
    }
  ).toISOString();
};
export namespace ErpHrmTimeTrackingReportDefinitionCollector {
  export async function collect(props: {
    body: IErpHrmTimeTrackingReportDefinition.ICreate;
    organization: IEntity;
    creatorMember: IEntity;
  }) {
    const id = v4();
    return {
      id,
      code: props.body.code,
      name: props.body.name,
      description: props.body.description ?? null,
      report_type: props.body.report_type,
      is_active: props.body.is_active,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
      organization: { connect: { id: props.organization.id } },
      creatorMember: { connect: { id: props.creatorMember.id } },
      definitionDimensions: {
        create: await ArrayUtil.asyncMap(
          props.body
            .definitionDimensions as IErpHrmTimeTrackingReportDefinitionDimension.ICreate[],
          (dimension) =>
            ErpHrmTimeTrackingReportDefinitionDimensionCollector.collect({
              body: dimension,
              reportDefinition: { id },
            }),
        ),
      },
      definitionFilters: {
        create: await ArrayUtil.asyncMap(
          props.body
            .definitionFilters as IErpHrmTimeTrackingReportDefinitionFilter.ICreate[],
          (filter) =>
            ErpHrmTimeTrackingReportDefinitionFilterCollector.collect({
              body: filter,
              reportDefinition: { id },
            }),
        ),
      },
    } satisfies Prisma.erp_hrm_time_tracking_report_definitionsCreateInput;
  }
}
