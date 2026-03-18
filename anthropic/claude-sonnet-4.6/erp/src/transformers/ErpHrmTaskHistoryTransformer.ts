import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmOrganizationMemberAtSummaryTransformer } from "./ErpHrmOrganizationMemberAtSummaryTransformer";
import { ErpHrmTaskAtSummaryTransformer } from "./ErpHrmTaskAtSummaryTransformer";

export namespace ErpHrmTaskHistoryTransformer {
  export type Payload = Prisma.erp_hrm_task_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        old_status: true,
        new_status: true,
        created_at: true,
        task: ErpHrmTaskAtSummaryTransformer.select(),
        organizationMember:
          ErpHrmOrganizationMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_task_historiesFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmTaskHistory> {
    return {
      id: input.id,
      task: await ErpHrmTaskAtSummaryTransformer.transform(input.task),
      recorder: await ErpHrmOrganizationMemberAtSummaryTransformer.transform(
        input.organizationMember,
      ),
      oldStatus: input.old_status,
      newStatus: input.new_status,
      createdAt: input.created_at.toISOString(),
    };
  }
}
