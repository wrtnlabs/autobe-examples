import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmOrganizationCollector {
  export async function collect(props: {
    body: IErpHrmOrganization.ICreate;
    member: IEntity;
    session: IEntity;
  }) {
    return {
      id: v4(),
      name: props.body.name,
      description: props.body.description ?? null,
      logo_image: props.body.logoImage ?? null,
      currency: props.body.currency,
      timezone: props.body.timezone,
      fiscal_start_month: props.body.fiscalStartMonth,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      owner: { connect: { id: props.member.id } },
      memberSessions: undefined,
      roles: undefined,
      employees: undefined,
      departments: undefined,
      projects: undefined,
      invitations: undefined,
      activityLogs: undefined,
    } satisfies Prisma.erp_hrm_organizationsCreateInput;
  }
}
