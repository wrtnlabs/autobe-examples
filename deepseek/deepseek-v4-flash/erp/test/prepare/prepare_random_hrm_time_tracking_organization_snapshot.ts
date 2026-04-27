import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random organization snapshot creation data for E2E testing.
 *
 * Generates a complete IHrmTimeTrackingOrganizationSnapshot.ICreate with a
 * randomized event details annotation describing why the snapshot is being
 * created.
 *
 * Only the {@link eventDetails} field is user-customizable; all other fields
 * are automatically populated from the organization's current state.
 *
 * @param input - Optional partial input to override specific fields
 * @returns A complete IHrmTimeTrackingOrganizationSnapshot.ICreate with random data
 */
export function prepare_random_hrm_time_tracking_organization_snapshot(
  input?: DeepPartial<IHrmTimeTrackingOrganizationSnapshot.ICreate> | undefined,
): IHrmTimeTrackingOrganizationSnapshot.ICreate {
  return {
    eventDetails:
      input?.eventDetails ?? RandomGenerator.paragraph({ sentences: 1 }),
  };
}
