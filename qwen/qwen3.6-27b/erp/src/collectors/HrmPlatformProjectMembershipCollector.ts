import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmPlatformProjectMembershipCollector {
  export async function collect(props: {
    body: IHrmPlatformProjectMembership.ICreate;
    hrmPlatformProjects: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      capacity_role: props.body.capacityRole,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      employee: { connect: { id: props.body.employeeId } },
      project: { connect: { id: props.hrmPlatformProjects.id } },
    } satisfies Prisma.hrm_platform_project_membershipsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmPlatformProjectMembershipCollector {
//         export async function collect(props: {
//           body: IHrmPlatformProjectMembership.ICreate;
//           hrmPlatformProjects: IEntity; // from path parameter projectId
//           
//           
//         }) {
//           return {
//       id: ...,
//       capacity_role: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       employee: ...,
//       project: ...,
//           } satisfies Prisma.hrm_platform_project_membershipsCreateInput;
//         }
//       }
//--------------------------------------------------------------