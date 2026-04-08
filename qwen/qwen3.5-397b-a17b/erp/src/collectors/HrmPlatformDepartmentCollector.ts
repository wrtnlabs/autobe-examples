import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmPlatformDepartmentCollector {
  export async function collect(props: {
    body: IHrmPlatformDepartment.ICreate;
    hrmPlatformOrganizations: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      description: props.body.description ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: { connect: { id: props.hrmPlatformOrganizations.id } },
      parentDepartment: props.body.parentDepartmentId
        ? { connect: { id: props.body.parentDepartmentId } }
        : undefined,
      childDepartments: undefined,
      employees: undefined,
      employeeInvitations: undefined,
    } satisfies Prisma.hrm_platform_departmentsCreateInput;
  }
}
