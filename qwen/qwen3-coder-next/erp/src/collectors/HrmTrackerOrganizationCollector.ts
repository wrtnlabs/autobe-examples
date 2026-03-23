import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTrackerOrganizationCollector {
  export async function collect(props: {
    body: IHrmTrackerOrganization.ICreate;
    hrmTrackerMembers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      description: props.body.description ?? null,
      logo_image_uri: props.body.logo_image_uri ?? null,
      currency: props.body.currency,
      timezone: props.body.timezone,
      fiscal_start_month: props.body.fiscal_start_month,
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      ownedOrganization: { connect: { id: props.hrmTrackerMembers.id } },
      systemConfigs: undefined,
      pendingInvitations: undefined,
      employees: undefined,
      roles: undefined,
      departments: undefined,
      employeeHistories: undefined,
      projects: undefined,
      taskHistories: undefined,
      timelogs: undefined,
      timesheets: undefined,
      employeeContracts: undefined,
      timers: undefined,
    } satisfies Prisma.hrm_tracker_organizationsCreateInput;
  }
}
