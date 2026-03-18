import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProjectMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmsProjectMemberCollector {
  export async function collect(props: {
    body: IHrmsProjectMember.ICreate;
    hrmsProjects: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      role: props.body.role,
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // Belongs to relations
      employee: { connect: { id: props.body.employee_id } },
      project: { connect: { id: props.hrmsProjects.id } },
    } satisfies Prisma.hrms_project_membersCreateInput;
  }
}
