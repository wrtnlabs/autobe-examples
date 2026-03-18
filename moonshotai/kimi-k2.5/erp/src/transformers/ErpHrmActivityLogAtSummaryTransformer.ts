import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmActivityLogAtActorGuestTransformer } from "./ErpHrmActivityLogAtActorGuestTransformer";

export namespace ErpHrmActivityLogAtSummaryTransformer {
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
        organization: {
          select: {
            id: true,
          },
        } satisfies Prisma.erp_hrm_organizationsFindManyArgs,
        actorMember: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
          },
        } satisfies Prisma.erp_hrm_membersFindManyArgs,
        actorGuest: ErpHrmActivityLogAtActorGuestTransformer.select(),
        details: {
          select: {
            id: true,
          },
        } satisfies Prisma.erp_hrm_activity_log_detailsFindManyArgs,
      },
    } satisfies Prisma.erp_hrm_activity_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmActivityLog.ISummary> {
    return {
      id: input.id,
      action: input.action,
      entity_type: input.entity_type,
      entity_id: input.entity_id ?? null,
      created_at: input.created_at.toISOString(),
      actor: input.actorMember
        ? {
            id: input.actorMember.id,
            type: "member" as const,
            name: `${input.actorMember.first_name} ${input.actorMember.last_name}`,
          }
        : await ErpHrmActivityLogAtActorGuestTransformer.transform(
            input.actorGuest!,
          ),
    };
  }
}
