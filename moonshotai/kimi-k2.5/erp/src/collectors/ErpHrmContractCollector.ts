import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmContractCollector {
  export async function collect(props: {
    body: IErpHrmContract.ICreate;
    organizationMember: IEntity;
  }) {
    const id: string = v4();
    // Query organization member to get organization_id for the organization relation
    const orgMember =
      await MyGlobal.prisma.erp_hrm_organization_members.findFirstOrThrow({
        where: { id: props.organizationMember.id },
      });
    return {
      id,
      employment_type: props.body.employment_type,
      pay_rate: props.body.pay_rate,
      pay_period: props.body.pay_period,
      working_hours_per_week: props.body.working_hours_per_week,
      start_date: new Date(props.body.start_date),
      end_date: props.body.end_date ? new Date(props.body.end_date) : null,
      notes: props.body.notes ?? null,
      is_active: props.body.end_date ? false : true,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organizationMember: { connect: { id: props.organizationMember.id } },
      organization: { connect: { id: orgMember.organization_id } },
    } satisfies Prisma.erp_hrm_contractsCreateInput;
  }
}
