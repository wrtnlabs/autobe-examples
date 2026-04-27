import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingInvitation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM time tracking invitation data for E2E testing.
 *
 * Generates a complete IHrmTimeTrackingInvitation.ICreate with a randomized
 * email address and role UUID. Both properties can be overridden via the
 * optional `input` parameter for specific test scenarios.
 *
 * @param input - Partial invitation data to override specific fields
 * @returns A complete IHrmTimeTrackingInvitation.ICreate instance
 */
export function prepare_random_hrm_time_tracking_invitation(
  input?: DeepPartial<IHrmTimeTrackingInvitation.ICreate> | undefined,
): IHrmTimeTrackingInvitation.ICreate {
  return {
    email: input?.email ?? typia.random<string & tags.Format<"email">>(),
    role_id: input?.role_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
