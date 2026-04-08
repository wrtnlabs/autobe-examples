import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformMemberAtSummaryTransformer } from "./HrmPlatformMemberAtSummaryTransformer";
import { HrmPlatformOrganizationAtSummaryTransformer } from "./HrmPlatformOrganizationAtSummaryTransformer";

export namespace HrmPlatformActivityLogAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_activity_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        target_entity_type: true,
        target_entity_id: true,
        details: true,
        created_at: true,
        organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
        member: HrmPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_activity_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformActivityLog.ISummary> {
    return {
      id: input.id,
      actionType: input.action_type,
      targetEntityType: input.target_entity_type,
      targetEntityId: input.target_entity_id,
      details: input.details,
      createdAt: input.created_at.toISOString(),
      member: await HrmPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
      organization: await HrmPlatformOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
    } satisfies IHrmPlatformActivityLog.ISummary;
  }
}
