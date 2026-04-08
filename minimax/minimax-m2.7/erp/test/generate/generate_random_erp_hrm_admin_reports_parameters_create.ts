import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import type { IErpHrmReportParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReportParameter";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_report_parameter } from "../prepare/prepare_random_erp_hrm_report_parameter";

export async function generate_random_erp_hrm_admin_reports_parameters_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmReportParameter.ICreate>;
    params: {
      reportId: string;
    };
  }
): Promise<IErpHrmReportParameter> {
  const prepared: IErpHrmReportParameter.ICreate = prepare_random_erp_hrm_report_parameter(
    props.body
  );
  const result: IErpHrmReportParameter = await api.functional.erpHrm.admin.reports.parameters.create(
    connection,
    {
      reportId: props.params.reportId,
      body: prepared,
    }
  );
  return result;
}