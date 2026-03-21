import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmEmployeeAtSummaryTransformer } from "./ErpHrmEmployeeAtSummaryTransformer";
import { ErpHrmProjectAtSummaryTransformer } from "./ErpHrmProjectAtSummaryTransformer";
import { ErpHrmTaskAtSummaryTransformer } from "./ErpHrmTaskAtSummaryTransformer";

export namespace ErpHrmTimelogTransformer {
  export type Payload = Prisma.erp_hrm_timelogsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        date: true,
        duration: true,
        description: true,
        billable: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employee: ErpHrmEmployeeAtSummaryTransformer.select(),
        project: ErpHrmProjectAtSummaryTransformer.select(),
        task: ErpHrmTaskAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_timelogsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmTimelog> {
    return {
      id: input.id,
      employee: await ErpHrmEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      project: await ErpHrmProjectAtSummaryTransformer.transform(input.project),
      task: input.task
        ? await ErpHrmTaskAtSummaryTransformer.transform(input.task)
        : null,
      date: input.date.toISOString(),
      duration: input.duration,
      description: input.description,
      billable: input.billable,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
