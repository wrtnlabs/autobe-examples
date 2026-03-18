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
    erpHrmMembers: IEntity;
    erpHrmMemberSessions: IEntity;
  }): Promise<Prisma.erp_hrm_organizationsCreateInput> {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      description: props.body.description ?? null,
      logo_url: props.body.logo_url ?? null,
      currency: props.body.currency,
      timezone: props.body.timezone,
      fiscal_year_start_month: props.body.fiscal_year_start_month,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      owner: { connect: { id: props.erpHrmMembers.id } },
    } satisfies Prisma.erp_hrm_organizationsCreateInput;
  }
}
