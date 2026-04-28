import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_platform_organization } from "../prepare/prepare_random_hrm_platform_organization";

/**
 * Generate a random HRM platform organization for E2E testing.
 *
 * Prepares random organization creation data including name, description, logo
 * URI, currency, timezone, and fiscal year start month using the prepare
 * function. All fields can be partially overridden via the `body` parameter for
 * targeted test scenarios.
 *
 * Calls the organization creation endpoint which validates name uniqueness,
 * ISO 4217 currency codes, IANA timezone identifiers, and fiscal month range.
 * The calling user is automatically assigned as the organization owner.
 */
export async function generate_random_hrm_platform_organizations_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmPlatformOrganization.ICreate> | undefined;
  },
): Promise<IHrmPlatformOrganization> {
  const prepared: IHrmPlatformOrganization.ICreate =
    prepare_random_hrm_platform_organization(props.body);
  const result: IHrmPlatformOrganization =
    await api.functional.hrmPlatform.organizations.create(connection, {
      body: prepared,
    });
  return result;
}
