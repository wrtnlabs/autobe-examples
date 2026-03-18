import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmTimerCollector {
  export async function collect(props: {
    body: IErpHrmTimer.ICreate;
    erpHrmOrganizationMembers: IEntity;
    erpHrmMemberSessions: IEntity;
  }) {
    return {
      id: v4(),
      description: props.body.description ?? null,
      started_at: new Date(),
      created_at: new Date(),
      organizationMember: {
        connect: { id: props.erpHrmOrganizationMembers.id },
      },
      project: {
        connect: { id: props.body.project_id },
      },
      task: props.body.task_id
        ? { connect: { id: props.body.task_id } }
        : undefined,
    } satisfies Prisma.erp_hrm_timersCreateInput;
  }
}
