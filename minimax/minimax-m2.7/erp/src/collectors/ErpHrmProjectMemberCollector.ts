import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmProjectMemberCollector {
  export async function collect(props: {
    body: IErpHrmProjectMember.ICreate;
    erpHrmOrganizations: IEntity;
  }) {
    return {
      id: v4(),
      name: props.body.name,
      description: props.body.description ?? null,
      color: props.body.color,
      status: props.body.status,
      budget_hours: props.body.budget_hours ?? null,
      start_date: props.body.start_date
        ? new Date(props.body.start_date)
        : null,
      end_date: props.body.end_date ? new Date(props.body.end_date) : null,
      created_at: new Date(),
      updated_at: new Date(),
      organization: { connect: { id: props.erpHrmOrganizations.id } },
    } satisfies Prisma.erp_hrm_projectsCreateInput;
  }
}
