import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import { IHrmPlatformActivityLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLogDetail";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformMemberAtSummaryTransformer } from "./HrmPlatformMemberAtSummaryTransformer";
import { HrmPlatformOrganizationAtSummaryTransformer } from "./HrmPlatformOrganizationAtSummaryTransformer";

export namespace HrmPlatformActivityLogTransformer {
  export type Payload = Prisma.hrm_platform_activity_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        target_entity: true,
        target_id: true,
        details: true,
        created_at: true,
        organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
        user: HrmPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_activity_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformActivityLog> {
    return {
      id: input.id,
      organization_id: input.organization.id,
      user_id: input.user.id,
      action_type: input.action_type,
      target_entity: input.target_entity,
      target_id: input.target_id ?? null,
      details: input.details ? JSON.parse(input.details) : null,
      created_at: input.created_at.toISOString(),
      organization: await HrmPlatformOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      user: await HrmPlatformMemberAtSummaryTransformer.transform(input.user),
    };
  }
}
