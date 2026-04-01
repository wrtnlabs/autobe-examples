import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmPlatformEmployeeCollector {
  export async function collect(props: {
    body: IHrmPlatformEmployee.ICreate;
    user: IEntity;
    hrmPlatformOrganizations: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      position: props.body.position ?? null,
      employment_type: props.body.employment_type,
      status: props.body.status,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      user: { connect: { id: props.user.id } },
      organization: { connect: { id: props.hrmPlatformOrganizations.id } },
      role: { connect: { id: props.body.hrm_platform_role_id } },
      department: props.body.hrm_platform_department_id
        ? { connect: { id: props.body.hrm_platform_department_id } }
        : undefined,
    } satisfies Prisma.hrm_platform_employeesCreateInput;
  }
}
