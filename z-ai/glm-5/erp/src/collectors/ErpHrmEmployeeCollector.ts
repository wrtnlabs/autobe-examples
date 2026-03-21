import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmEmployeeCollector {
  export async function collect(props: {
    body: IErpHrmEmployee.ICreate;
    organization: IEntity;
  }) {
    const id: string = v4();
    // Query member by email
    const member = await MyGlobal.prisma.erp_hrm_members.findFirstOrThrow({
      where: { email: props.body.email },
    });
    return {
      id,
      position: props.body.position ?? null,
      employment_type: props.body.employmentType,
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: member.id } },
      organization: { connect: { id: props.organization.id } },
      role: { connect: { id: props.body.roleId } },
      department: props.body.departmentId
        ? { connect: { id: props.body.departmentId } }
        : undefined,
    } satisfies Prisma.erp_hrm_employeesCreateInput;
  }
}
