import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import { IErpHrmReportParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReportParameter";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmMemberAtSummaryTransformer } from "./ErpHrmMemberAtSummaryTransformer";
import { ErpHrmOrganizationAtSummaryTransformer } from "./ErpHrmOrganizationAtSummaryTransformer";
import { ErpHrmReportParameterTransformer } from "./ErpHrmReportParameterTransformer";

export namespace ErpHrmReportTransformer {
  export type Payload = Prisma.erp_hrm_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        report_type: true,
        name: true,
        created_at: true,
        updated_at: true,
        organization: ErpHrmOrganizationAtSummaryTransformer.select(),
        generatedByMember: ErpHrmMemberAtSummaryTransformer.select(),
        parameter: ErpHrmReportParameterTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_reportsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmReport> {
    return {
      id: input.id,
      report_type: input.report_type,
      name: input.name ?? undefined,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      organization: await ErpHrmOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      generatedByMember: await ErpHrmMemberAtSummaryTransformer.transform(
        input.generatedByMember,
      ),
      parameter: input.parameter
        ? await ErpHrmReportParameterTransformer.transform(input.parameter)
        : (null as never),
    };
  }
}
