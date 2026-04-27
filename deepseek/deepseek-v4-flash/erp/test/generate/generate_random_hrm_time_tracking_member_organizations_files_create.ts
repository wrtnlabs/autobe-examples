import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOrganizationFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_tracking_organization_file } from "../prepare/prepare_random_hrm_time_tracking_organization_file";

/**
 * Generate a random organization file via the API for E2E testing.
 *
 * Prepares random file metadata using the prepare function, then calls the
 * file creation endpoint to register the file under the specified organization.
 * The file record is created with system-generated identifiers and timestamps.
 * Requires the organization to already exist via the organizationId parameter.
 *
 * @param connection - API connection configuration
 * @param props.body - Optional partial file metadata to override generated values
 * @param props.params.organizationId - UUID of the target organization
 * @returns The created organization file entity
 */
export async function generate_random_hrm_time_tracking_member_organizations_files_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackingOrganizationFile.ICreate> | undefined;
    params: {
      organizationId: string;
    };
  },
): Promise<IHrmTimeTrackingOrganizationFile> {
  const prepared: IHrmTimeTrackingOrganizationFile.ICreate =
    prepare_random_hrm_time_tracking_organization_file(props.body);
  return await api.functional.hrmTimeTracking.member.organizations.files.create(
    connection,
    {
      body: prepared,
      organizationId: props.params.organizationId,
    },
  );
}
