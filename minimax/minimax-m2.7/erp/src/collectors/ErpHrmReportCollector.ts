import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import { IErpHrmReportParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReportParameter";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { ErpHrmReportParameterCollector } from "./ErpHrmReportParameterCollector";

export namespace ErpHrmReportCollector {
  export async function collect(props: {
    body: IErpHrmReport.ICreate;
    erpHrmOrganizations: IEntity;
    erpHrmMembers: IEntity;
  }) {
    const reportId = v4();
    return {
      id: reportId,
      report_type: props.body.report_type,
      name: props.body.name ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      organization: { connect: { id: props.erpHrmOrganizations.id } },
      generatedByMember: { connect: { id: props.erpHrmMembers.id } },
      parameter: {
        create: await ErpHrmReportParameterCollector.collect({
          body: props.body.parameter,
          report: { id: reportId },
        }),
      },
    } satisfies Prisma.erp_hrm_reportsCreateInput;
  }
}
