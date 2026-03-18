import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmDepartmentCollector {
  export async function collect(props: {
    body: IErpHrmDepartment.ICreate;
    erpHrmOrganizations: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      description: props.body.description ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: { connect: { id: props.erpHrmOrganizations.id } },
      parentDepartment: props.body.parentDepartmentId
        ? { connect: { id: props.body.parentDepartmentId } }
        : undefined,
    } satisfies Prisma.erp_hrm_departmentsCreateInput;
  }
}
