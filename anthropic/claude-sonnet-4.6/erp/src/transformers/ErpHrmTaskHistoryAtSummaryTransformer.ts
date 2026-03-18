import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmOrganizationMemberAtSummaryTransformer } from "./ErpHrmOrganizationMemberAtSummaryTransformer";

export namespace ErpHrmTaskHistoryAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_task_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        erp_hrm_task_id: true,
        old_status: true,
        new_status: true,
        created_at: true,
        organizationMember:
          ErpHrmOrganizationMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_task_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTaskHistory.ISummary> {
    return {
      id: input.id,
      taskId: input.erp_hrm_task_id,
      oldStatus: input.old_status,
      newStatus: input.new_status,
      recorder: await ErpHrmOrganizationMemberAtSummaryTransformer.transform(
        input.organizationMember,
      ),
      createdAt: input.created_at.toISOString(),
    };
  }
}
