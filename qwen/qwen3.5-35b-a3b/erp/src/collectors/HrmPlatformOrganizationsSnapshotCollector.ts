import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganizationsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationsSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmPlatformOrganizationsSnapshotCollector {
  export async function collect(props: {
    body: IHrmPlatformOrganizationsSnapshot.ICreate;
    hrmPlatformOrganizations: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      description: props.body.description ?? null,
      logo_uri: props.body.logo_uri ?? null,
      currency: props.body.currency,
      timezone: props.body.timezone ?? null,
      fiscal_start_month: props.body.fiscal_start_month ?? null,
      status: props.body.status,
      metadata: props.body.metadata ?? null,
      created_at: new Date(),
      organization: { connect: { id: props.hrmPlatformOrganizations.id } },
    } satisfies Prisma.hrm_platform_organizations_snapshotsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmPlatformOrganizationsSnapshotCollector {
//         export async function collect(props: {
//           body: IHrmPlatformOrganizationsSnapshot.ICreate;
//           hrmPlatformOrganizations: IEntity; // from path parameter organizationId
//           
//           
//         }) {
//           return {
//       id: ...,
//       name: ...,
//       description: ...,
//       logo_uri: ...,
//       currency: ...,
//       timezone: ...,
//       fiscal_start_month: ...,
//       status: ...,
//       metadata: ...,
//       created_at: ...,
//       organization: ...,
//           } satisfies Prisma.hrm_platform_organizations_snapshotsCreateInput;
//         }
//       }
//--------------------------------------------------------------