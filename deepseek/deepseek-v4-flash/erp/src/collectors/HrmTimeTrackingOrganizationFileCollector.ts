import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganizationFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationFile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackingOrganizationFileCollector {
  export async function collect(props: {
    body: IHrmTimeTrackingOrganizationFile.ICreate;
    organization: IEntity;
  }) {
    return {
      id: v4(),
      name: props.body.name,
      extension: props.body.extension,
      mime_type: props.body.mimeType,
      size: props.body.size,
      url: props.body.url,
      type: props.body.type,
      version: props.body.version ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      organization: { connect: { id: props.organization.id } },
    } satisfies Prisma.hrm_time_tracking_organization_filesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmTimeTrackingOrganizationFileCollector {
//         export async function collect(props: {
//           body: IHrmTimeTrackingOrganizationFile.ICreate;
//           hrmTimeTrackingOrganizations: IEntity; // from path parameter organizationId
//           
//           
//         }) {
//           return {
//       id: ...,
//       name: ...,
//       extension: ...,
//       mime_type: ...,
//       size: ...,
//       url: ...,
//       type: ...,
//       version: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       organization: ...,
//           } satisfies Prisma.hrm_time_tracking_organization_filesCreateInput;
//         }
//       }
//--------------------------------------------------------------