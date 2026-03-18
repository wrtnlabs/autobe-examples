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
    hrmPlatformOrganizations: IEntity;
  }) {
    const id: string = v4();
    // Query member to get display_name (not provided in DTO)
    const member = await MyGlobal.prisma.hrm_platform_members.findFirstOrThrow({
      where: { id: props.body.member_id },
    });
    return {
      // Scalar fields
      id,
      display_name: member.display_name,
      position: props.body.position ?? null,
      employment_type: props.body.employment_type,
      status: props.body.status ?? "active",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      member: { connect: { id: props.body.member_id } },
      organization: { connect: { id: props.hrmPlatformOrganizations.id } },
      role: { connect: { id: props.body.role_id } },
      department: props.body.department_id
        ? { connect: { id: props.body.department_id } }
        : undefined,
    } satisfies Prisma.hrm_platform_employeesCreateInput;
  }
}
