import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmMemberAtSummaryTransformer } from "./ErpHrmMemberAtSummaryTransformer";

export namespace ErpHrmActivityLogAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_activity_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        entity_type: true,
        entity_id: true,
        details: true,
        created_at: true,
        member: ErpHrmMemberAtSummaryTransformer.select(),
        organization: true,
      },
    } satisfies Prisma.erp_hrm_activity_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmActivityLog.ISummary> {
    return {
      id: input.id,
      actionType: input.action_type,
      entityType: input.entity_type,
      entityId: input.entity_id,
      details: input.details,
      member: await ErpHrmMemberAtSummaryTransformer.transform(input.member),
      createdAt: input.created_at.toISOString(),
    };
  }
}
