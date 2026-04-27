import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackingProjectMemberCollector {
  export async function collect(props: {
    body: IHrmTimeTrackingProjectMember.ICreate;
    hrmTimeTrackingProjects: IEntity;
  }) {
    return {
      id: v4(),
      role: props.body.role,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      project: { connect: { id: props.hrmTimeTrackingProjects.id } },
      employee: { connect: { id: props.body.employee_id } },
    } satisfies Prisma.hrm_time_tracking_project_membersCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmTimeTrackingProjectMemberCollector {
//         export async function collect(props: {
//           body: IHrmTimeTrackingProjectMember.ICreate;
//           hrmTimeTrackingProjects: IEntity; // from path parameter projectId
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
//           } satisfies Prisma.hrm_time_tracking_project_membersCreateInput;
//         }
//       }
//--------------------------------------------------------------