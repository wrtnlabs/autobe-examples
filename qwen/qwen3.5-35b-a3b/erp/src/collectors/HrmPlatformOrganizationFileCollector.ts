import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganizationFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationFile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmPlatformOrganizationFileCollector {
  export async function collect(props: {
    body: IHrmPlatformOrganizationFile.ICreate;
    hrmPlatformOrganizations: IEntity;
    hrmPlatformMembers: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      file_key: props.body.file_key,
      file_name: props.body.file_name,
      file_type: props.body.file_type,
      file_size: props.body.file_size,
      storage_type: props.body.storage_type,
      url: props.body.url ?? null,
      status: props.body.status ?? "active",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // Belongs to relations
      organization: { connect: { id: props.hrmPlatformOrganizations.id } },
      member: { connect: { id: props.hrmPlatformMembers.id } },
    } satisfies Prisma.hrm_platform_organization_filesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmPlatformOrganizationFileCollector {
//         export async function collect(props: {
//           body: IHrmPlatformOrganizationFile.ICreate;
//           hrmPlatformOrganizations: IEntity; // from path parameter organizationId
// hrmPlatformMembers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       file_key: ...,
//       file_name: ...,
//       file_type: ...,
//       file_size: ...,
//       storage_type: ...,
//       url: ...,
//       status: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       organization: ...,
//       member: ...,
//           } satisfies Prisma.hrm_platform_organization_filesCreateInput;
//         }
//       }
//--------------------------------------------------------------