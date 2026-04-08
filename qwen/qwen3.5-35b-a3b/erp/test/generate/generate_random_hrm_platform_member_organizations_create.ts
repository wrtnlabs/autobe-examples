import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_platform_organization } from "../prepare/prepare_random_hrm_platform_organization";

/**
 * Generate a random organization via the API for E2E testing.
 *
 * Creates a new HRM platform organization using the prepare function to generate random data,
 * then calls the POST /hrmPlatform/member/organizations endpoint to create the organization.
 * The organization serves as the tenant boundary for the HRM platform with randomized
 * name, description, currency, timezone, and fiscal year start month.
 */
export async function generate_random_hrm_platform_member_organizations_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmPlatformOrganization.ICreate> | undefined;
  },
): Promise<IHrmPlatformOrganization> {
  const prepared: IHrmPlatformOrganization.ICreate =
    prepare_random_hrm_platform_organization(props.body);
  const result: IHrmPlatformOrganization =
    await api.functional.hrmPlatform.member.organizations.create(connection, {
      body: prepared,
    });
  return result;
}
