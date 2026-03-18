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
  }) {
    const id: string = v4();
    return {
      id,
      description: props.body.description ?? null,
      started_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      organizationMember: {
        connect: { id: props.erpHrmOrganizationMembers.id },
      },
      project: { connect: { id: props.body.projectId } },
      task: props.body.taskId
        ? { connect: { id: props.body.taskId } }
        : undefined,
    } satisfies Prisma.erp_hrm_timersCreateInput;
  }
}
