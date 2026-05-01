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
    erpHrmProjects: IEntity;
  }) {
    return {
      id: v4(),
      role: props.body.role ?? "member",
      joined_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      employee: { connect: { id: props.body.erp_hrm_employee_id } },
      project: { connect: { id: props.erpHrmProjects.id } },
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
//       role: ...,
//       joined_at: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       employee: ...,
//       project: ...,
//           } satisfies Prisma.erp_hrm_project_membersCreateInput;
//         }
//       }
//--------------------------------------------------------------