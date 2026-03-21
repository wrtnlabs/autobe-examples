import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmMemberAtSummaryTransformer } from "./ErpHrmMemberAtSummaryTransformer";

export namespace ErpHrmReportAtSummaryTransformer {
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
        organization: true,
        parameter: true,
        generatedByMember: ErpHrmMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmReport.ISummary> {
    return {
      id: input.id,
      report_type: input.report_type,
      name: input.name ?? undefined,
      created_at: input.created_at.toISOString(),
      generatedByMember: await ErpHrmMemberAtSummaryTransformer.transform(
        input.generatedByMember,
      ),
    };
  }
}
