import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the primary success path for retrieving an organization logo.
 *
 * This test validates that:
 * 1. An authenticated admin can retrieve an organization's logo
 * 2. The response contains valid logo data with all required fields
 * 3. The logo data structure matches the expected IHrmPlatformOrganizationLogo type
 * 4. The organization summary within the logo response is properly populated
 */
export async function test_api_organization_logo_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Generate a valid organization ID for testing
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve organization logo
  const logo: IHrmPlatformOrganizationLogo =
    await api.functional.hrmPlatform.admin.organizations.logo.at(
      adminConnection,
      {
        organizationId,
      },
    );
  typia.assert(logo);
  // 4. Validate organization name is not empty
  TestValidator.predicate(
    "organization name is not empty",
    logo.organization.name.length > 0,
  );
  // 5. Validate fiscal year start month is in valid range (1-12)
  TestValidator.predicate(
    "fiscal year start month is valid (1-12)",
    logo.organization.setting.fiscal_year_start_month >= 1 &&
      logo.organization.setting.fiscal_year_start_month <= 12,
  );
  // 6. Validate image URL is not empty
  TestValidator.predicate("image_url is not empty", logo.image_url.length > 0);
  // 7. Validate logo is active (not deleted)
  TestValidator.equals(
    "deleted_at is null (active logo)",
    logo.deleted_at,
    null,
  );
  // 8. Validate timestamp ordering
  TestValidator.predicate(
    "created_at is before or equal to updated_at",
    new Date(logo.created_at) <= new Date(logo.updated_at),
  );
}
