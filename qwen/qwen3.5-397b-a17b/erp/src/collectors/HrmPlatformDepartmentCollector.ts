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
      // Scalar fields
      id,
      name: props.body.name,
      description: props.body.description ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      organization: { connect: { id: props.hrmPlatformOrganizations.id } },
      parent: props.body.parent_id
        ? { connect: { id: props.body.parent_id } }
        : undefined,
      // HasMany relations (not needed for create)
      children: undefined,
      employees: undefined,
      employeeDepartmentHistories: undefined,
    } satisfies Prisma.hrm_platform_departmentsCreateInput;
  }
}
