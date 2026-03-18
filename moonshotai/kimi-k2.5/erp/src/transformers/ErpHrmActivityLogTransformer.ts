import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import { IErpHrmActivityLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLogDetail";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmActivityLogDetailAtSummaryTransformer } from "./ErpHrmActivityLogDetailAtSummaryTransformer";
import { ErpHrmGuestTransformer } from "./ErpHrmGuestTransformer";
import { ErpHrmOrganizationAtSummaryTransformer } from "./ErpHrmOrganizationAtSummaryTransformer";
import { ErpHrmOrganizationMemberAtSummaryTransformer } from "./ErpHrmOrganizationMemberAtSummaryTransformer";

export namespace ErpHrmActivityLogTransformer {
  export type Payload = Prisma.erp_hrm_activity_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action: true,
        entity_type: true,
        entity_id: true,
        ip_address: true,
        user_agent: true,
        created_at: true,
        organization: ErpHrmOrganizationAtSummaryTransformer.select(),
        actorMember: ErpHrmOrganizationMemberAtSummaryTransformer.select(),
        actorGuest: ErpHrmGuestTransformer.select(),
        details: ErpHrmActivityLogDetailAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_activity_logsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmActivityLog> {
    return {
      id: input.id,
      action: input.action,
      entityType: input.entity_type,
      entityId: input.entity_id ?? null,
      ipAddress: input.ip_address ?? null,
      userAgent: input.user_agent ?? null,
      organization: await ErpHrmOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      actorMember: input.actorMember
        ? await ErpHrmOrganizationMemberAtSummaryTransformer.transform(
            input.actorMember,
          )
        : null,
      actorGuest: input.actorGuest
        ? await ErpHrmGuestTransformer.transform(input.actorGuest)
        : null,
      details: await ArrayUtil.asyncMap(
        input.details,
        ErpHrmActivityLogDetailAtSummaryTransformer.transform,
      ),
      createdAt: input.created_at.toISOString(),
    };
  }
}
