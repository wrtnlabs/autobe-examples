import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingInvitation";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_tracking_invitation } from "../prepare/prepare_random_hrm_time_tracking_invitation";

/**
 * Generate a random HRM time tracking invitation via the API for E2E testing.
 *
 * Prepares random invitation data using the prepare function, then calls the
 * invitation creation endpoint. The generated invitation contains a randomized
 * email address and role UUID for testing invitation workflows.
 *
 * @param connection - The API connection configuration
 * @param props.body - Optional partial invitation data to override specific fields
 * @returns The created invitation record with full details
 */
export async function generate_random_hrm_time_tracking_member_invitations_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackingInvitation.ICreate> | undefined;
  },
): Promise<IHrmTimeTrackingInvitation> {
  const prepared: IHrmTimeTrackingInvitation.ICreate =
    prepare_random_hrm_time_tracking_invitation(props.body);
  return await api.functional.hrmTimeTracking.member.invitations.create(
    connection,
    {
      body: prepared,
    },
  );
}
