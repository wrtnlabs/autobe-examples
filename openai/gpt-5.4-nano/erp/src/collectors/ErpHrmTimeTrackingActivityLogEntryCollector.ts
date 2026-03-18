import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingActivityLogEntry";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmTimeTrackingActivityLogEntryCollector {
  export async function collect(props: {
    body: IErpHrmTimeTrackingActivityLogEntry.ICreate;
    organization: IEntity;
    performedByMember: IEntity;
  }) {
    return {
      id: v4(),
      action_type: props.body.action_type,
      target_entity_type: props.body.target_entity_type,
      target_entity_id: props.body.target_entity_id,
      summary: props.body.summary,
      details: props.body.details ?? null,
      occurred_at: new Date(props.body.occurred_at),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: { connect: { id: props.organization.id } },
      performedByMember: { connect: { id: props.performedByMember.id } },
    } satisfies Prisma.erp_hrm_time_tracking_activity_log_entriesCreateInput;
  }
}
