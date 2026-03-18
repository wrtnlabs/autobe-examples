import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmOrganizationMemberAtSummaryTransformer } from "./ErpHrmOrganizationMemberAtSummaryTransformer";

export namespace ErpHrmActivityLogAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_activity_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        target_entity_type: true,
        target_entity_id: true,
        organization_member_id: true,
        details: true,
        created_at: true,
        performer: ErpHrmOrganizationMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_activity_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmActivityLog.ISummary> {
    return {
      id: input.id,
      action_type: input.action_type,
      target_entity_type: input.target_entity_type,
      target_entity_id: input.target_entity_id,
      organization_member_id: input.organization_member_id,
      performer: await ErpHrmOrganizationMemberAtSummaryTransformer.transform(
        input.performer,
      ),
      details: input.details,
      created_at: input.created_at.toISOString(),
    };
  }
}
