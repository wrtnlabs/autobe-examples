import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmMemberAtSummaryTransformer } from "./ErpHrmMemberAtSummaryTransformer";
import { ErpHrmOrganizationAtSummaryTransformer } from "./ErpHrmOrganizationAtSummaryTransformer";

export namespace ErpHrmActivityLogTransformer {
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
        organization: ErpHrmOrganizationAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_activity_logsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmActivityLog> {
    return {
      id: input.id,
      action_type: input.action_type,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      details: input.details,
      member: await ErpHrmMemberAtSummaryTransformer.transform(input.member),
      organization: await ErpHrmOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      created_at: input.created_at.toISOString(),
    };
  }
}
