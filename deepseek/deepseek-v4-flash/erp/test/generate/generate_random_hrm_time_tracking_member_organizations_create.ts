import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_tracking_organization } from "../prepare/prepare_random_hrm_time_tracking_organization";

/**
 * Generate a random HRM time tracking organization via the API for E2E testing.
 *
 * Prepares random organization data using the prepare function, then calls the
 * organization creation endpoint. The created organization will be owned by the
 * currently authenticated member with active status.
 *
 * All organization properties can be customized via the optional `body` parameter
 * for specific test scenarios requiring particular configurations.
 *
 * @param connection - The API connection configuration
 * @param props.body - Optional partial overrides for organization creation data
 * @returns The newly created organization entity
 */
export async function generate_random_hrm_time_tracking_member_organizations_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackingOrganization.ICreate> | undefined;
  }
): Promise<IHrmTimeTrackingOrganization> {
  const prepared: IHrmTimeTrackingOrganization.ICreate = prepare_random_hrm_time_tracking_organization(
    props.body,
  );
  return await api.functional.hrmTimeTracking.member.organizations.create(
    connection,
    {
      body: prepared,
    },
  );
}