import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import type { IHrmTimeTrackingOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationSnapshot";
import { prepare_random_hrm_time_tracking_organization_snapshot } from "../prepare/prepare_random_hrm_time_tracking_organization_snapshot";

/**
 * Generate a random organization snapshot via the API for E2E testing.
 *
 * Prepares random snapshot creation data using the prepare function,
 * then calls the snapshot creation endpoint to create an actual snapshot
 * of the specified organization. Only the event details are user-customizable;
 * all other snapshot fields (organization attributes, owner info, status,
 * actor) are automatically populated from the organization's current state
 * and the authenticated user.
 *
 * @param connection The API connection to use
 * @param props.body Optional partial input to override specific fields in the
 *                   snapshot creation data
 * @param props.params.organizationId The target organization UUID whose
 *                                    snapshot is being created
 * @returns The created organization snapshot
 */
export async function generate_random_hrm_time_tracking_member_organizations_snapshots_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackingOrganizationSnapshot.ICreate> | undefined;
    params: {
      organizationId: string;
    };
  }
): Promise<IHrmTimeTrackingOrganizationSnapshot> {
  const prepared: IHrmTimeTrackingOrganizationSnapshot.ICreate = prepare_random_hrm_time_tracking_organization_snapshot(
    props.body
  );
  return await api.functional.hrmTimeTracking.member.organizations.snapshots.create(
    connection,
    {
      body: prepared,
      organizationId: props.params.organizationId,
    },
  );
}