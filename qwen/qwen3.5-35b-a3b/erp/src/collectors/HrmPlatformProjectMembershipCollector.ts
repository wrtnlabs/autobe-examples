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
    hrmPlatformOrganizations: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      organization_id: props.hrmPlatformOrganizations.id,
      role: props.body.role,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      employee: { connect: { id: props.body.employee_id } },
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
// hrmPlatformOrganizations: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       organization_id: ...,
//       role: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       employee: ...,
//       project: ...,
//           } satisfies Prisma.hrm_platform_project_membershipsCreateInput;
//         }
//       }
//--------------------------------------------------------------