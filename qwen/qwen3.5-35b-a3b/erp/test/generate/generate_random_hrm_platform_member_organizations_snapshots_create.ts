import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformOrganizationsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationsSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_platform_organizations_snapshot } from "../prepare/prepare_random_hrm_platform_organizations_snapshot";

/**
 * Generate a random organization snapshot via the API for E2E testing.
 *
 * Creates a point-in-time snapshot of an organization for audit trail and historical tracking purposes. Prepares random organization snapshot data using the prepare function, then calls the creation endpoint with the provided organization ID. The snapshot captures the organization's complete state including name, description, branding, financial settings, timezone, and status at the point of creation.
 *
 * @param connection - API connection with authentication and endpoint configuration
 * @param props.body - Optional partial organization snapshot data for customization
 * @param props.params.organizationId - UUID of the organization to create snapshot for
 * @returns Created organization snapshot record with system-generated fields
 */
export async function generate_random_hrm_platform_member_organizations_snapshots_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmPlatformOrganizationsSnapshot.ICreate>;
    params: {
      organizationId: string;
    };
  },
): Promise<IHrmPlatformOrganizationsSnapshot> {
  const prepared: IHrmPlatformOrganizationsSnapshot.ICreate =
    prepare_random_hrm_platform_organizations_snapshot(props.body);
  const result: IHrmPlatformOrganizationsSnapshot =
    await api.functional.hrmPlatform.member.organizations.snapshots.create(
      connection,
      {
        body: prepared,
        organizationId: props.params.organizationId,
      },
    );
  return result;
}
