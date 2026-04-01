import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsActivityLog";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmsMemberAtSummaryTransformer } from "./HrmsMemberAtSummaryTransformer";

export namespace HrmsActivityLogAtSummaryTransformer {
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
        organization: true,
        performedBy: HrmsMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrms_activity_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmsActivityLog.ISummary> {
    return {
      id: input.id,
      actionType: input.action_type,
      targetEntity: input.target_entity,
      targetId: input.target_id ?? undefined,
      performedBy: await HrmsMemberAtSummaryTransformer.transform(
        input.performedBy,
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IHrmsActivityLog.ISummary;
  }
}
