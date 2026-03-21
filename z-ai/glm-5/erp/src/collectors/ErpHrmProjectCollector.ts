import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmProjectCollector {
  export async function collect(props: {
    body: IErpHrmProject.ICreate;
    erpHrmOrganizations: IEntity;
  }) {
    return {
      id: v4(),
      name: props.body.name,
      description: props.body.description ?? null,
      color_code: props.body.color_code,
      status: "active",
      budget_hours: props.body.budget_hours ?? null,
      start_date: props.body.start_date
        ? new Date(props.body.start_date)
        : null,
      end_date: props.body.end_date ? new Date(props.body.end_date) : null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: { connect: { id: props.erpHrmOrganizations.id } },
      projectMembers: undefined,
      tasks: undefined,
      timelogs: undefined,
      timers: undefined,
    } satisfies Prisma.erp_hrm_projectsCreateInput;
  }
}
