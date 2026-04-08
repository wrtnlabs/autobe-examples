import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmProjectMemberCollector {
  export async function collect(props: {
    body: IErpHrmProjectMember.ICreate;
    project: IEntity;
  }) {
    return {
      id: v4(),
      assigned_role: props.body.assignedRole,
      created_at: new Date(),
      updated_at: new Date(),
      employee: { connect: { id: props.body.employeeId } },
      project: { connect: { id: props.project.id } },
    } satisfies Prisma.erp_hrm_project_membersCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ErpHrmProjectMemberCollector {
//         export async function collect(props: {
//           body: IErpHrmProjectMember.ICreate;
//           erpHrmProjects: IEntity; // from path parameter projectId
//           
//           
//         }) {
//           return {
//       id: ...,
//       assigned_role: ...,
//       created_at: ...,
//       updated_at: ...,
//       employee: ...,
//       project: ...,
//           } satisfies Prisma.erp_hrm_project_membersCreateInput;
//         }
//       }
//--------------------------------------------------------------