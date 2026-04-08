import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmProjectMemberCollector {
  export async function collect(props: {
    body: IHrmProjectMember.ICreate;
    project: IEntity;
  }) {
    const id: string = v4();
    // Query employee record from employee_id
    const employee = await MyGlobal.prisma.hrm_employees.findFirstOrThrow({
      where: { id: props.body.employee_id },
    });
    return {
      id,
      role: props.body.role,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      project: { connect: { id: props.project.id } },
      employee: { connect: { id: employee.id } },
    } satisfies Prisma.hrm_project_membersCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmProjectMemberCollector {
//         export async function collect(props: {
//           body: IHrmProjectMember.ICreate;
//           hrmProjects: IEntity; // from path parameter projectId
//           
//           
//         }) {
//           return {
//       id: ...,
//       role: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       project: ...,
//       employee: ...,
//           } satisfies Prisma.hrm_project_membersCreateInput;
//         }
//       }
//--------------------------------------------------------------