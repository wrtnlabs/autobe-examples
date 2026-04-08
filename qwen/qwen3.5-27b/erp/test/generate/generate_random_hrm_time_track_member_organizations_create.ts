import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_track_organization } from "../prepare/prepare_random_hrm_time_track_organization";

/**
 * Generate a random HRM time track organization via the API for E2E testing.
 *
 * Prepares random organization data using the prepare function, then calls the creation endpoint.
 * The organization serves as the root container for multi-tenant HRM and time tracking data with
 * complete data isolation between tenants. Organization settings include identity information
 * (name, description, logo), operational preferences (currency, timezone), and fiscal configuration
 * (fiscal start month) that apply to all entities within the organization.
 *
 * All properties support test-time customization through the DeepPartial input parameter,
 * allowing selective override of specific fields while maintaining realistic defaults for others.
 */
export async function generate_random_hrm_time_track_member_organizations_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackOrganization.ICreate>;
  },
): Promise<IHrmTimeTrackOrganization> {
  const prepared: IHrmTimeTrackOrganization.ICreate =
    prepare_random_hrm_time_track_organization(props.body);
  const result: IHrmTimeTrackOrganization =
    await api.functional.hrmTimeTrack.member.organizations.create(connection, {
      body: prepared,
    });
  return result;
}
