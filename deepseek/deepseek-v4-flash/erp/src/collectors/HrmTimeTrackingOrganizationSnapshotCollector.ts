import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackingOrganizationSnapshotCollector {
  export async function collect(props: {
    body: IHrmTimeTrackingOrganizationSnapshot.ICreate;
    hrmTimeTrackingOrganizations: IEntity;
    hrmTimeTrackingMembers: IEntity;
  }) {
    const organization =
      await MyGlobal.prisma.hrm_time_tracking_organizations.findFirstOrThrow({
        where: { id: props.hrmTimeTrackingOrganizations.id },
        include: {
          owner: {
            select: {
              display_name: true,
            },
          },
        },
      });
    return {
      id: v4(),
      name: organization.name,
      description: organization.description,
      logo_uri: null,
      currency: organization.currency,
      timezone: organization.timezone,
      fiscal_start_month: organization.fiscal_start_month,
      owner_member_id: organization.hrm_time_tracking_member_id,
      owner_display_name: organization.owner.display_name,
      status: organization.status,
      event_type: "snapshot",
      event_details: props.body.eventDetails ?? null,
      created_at: new Date(),
      organization: { connect: { id: props.hrmTimeTrackingOrganizations.id } },
      actor: { connect: { id: props.hrmTimeTrackingMembers.id } },
    } satisfies Prisma.hrm_time_tracking_organization_snapshotsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmTimeTrackingOrganizationSnapshotCollector {
//         export async function collect(props: {
//           body: IHrmTimeTrackingOrganizationSnapshot.ICreate;
//           hrmTimeTrackingOrganizations: IEntity; // from path parameter organizationId
// hrmTimeTrackingMembers: IEntity; // from authorized actor
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
//       owner_member_id: ...,
//       owner_display_name: ...,
//       status: ...,
//       event_type: ...,
//       event_details: ...,
//       created_at: ...,
//       organization: ...,
//       actor: ...,
//           } satisfies Prisma.hrm_time_tracking_organization_snapshotsCreateInput;
//         }
//       }
//--------------------------------------------------------------