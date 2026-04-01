import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsActivityLog";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmsMemberAtSummaryTransformer } from "./HrmsMemberAtSummaryTransformer";
import { HrmsOrganizationAtSummaryTransformer } from "./HrmsOrganizationAtSummaryTransformer";

export namespace HrmsActivityLogTransformer {
  export type Payload = Prisma.hrms_activity_logsGetPayload<
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
        updated_at: true,
        deleted_at: true,
        organization: HrmsOrganizationAtSummaryTransformer.select(),
        performedBy: HrmsMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrms_activity_logsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmsActivityLog> {
    return {
      id: input.id,
      action_type: input.action_type,
      target_entity: input.target_entity,
      target_id: input.target_id ?? undefined,
      details: input.details ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      organization: await HrmsOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      performedBy: await HrmsMemberAtSummaryTransformer.transform(
        input.performedBy,
      ),
    } satisfies IHrmsActivityLog;
  }
}
