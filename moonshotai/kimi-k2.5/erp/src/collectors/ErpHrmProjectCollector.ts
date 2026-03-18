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
    const now = new Date();
    return {
      id: v4(),
      name: props.body.name,
      color_code: props.body.colorCode ?? null,
      description: props.body.description ?? null,
      status: props.body.status ?? "active",
      budget_hours: props.body.budgetHours ?? null,
      start_date: props.body.startDate ? new Date(props.body.startDate) : null,
      end_date: props.body.endDate ? new Date(props.body.endDate) : null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      organization: { connect: { id: props.erpHrmOrganizations.id } },
    } satisfies Prisma.erp_hrm_projectsCreateInput;
  }
}
