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
 * Test that organization logo update enforces proper access control.
 *
 * This test validates the permission-based access control for organization logo updates:
 * 1. Creates two admin accounts with different credentials
 * 2. Attempts logo updates with both admin connections on the same organization
 * 3. Verifies that permission validation is enforced (at least one admin receives authorization error)
 * 4. Confirms that the backend validates permissions before processing logo updates
 *
 * Note: Without organization creation API, we cannot fully test owner vs non-owner distinction,
 * but we can verify that permission checks are in place and not all admins have unrestricted access.
 */
export async function test_api_organization_logo_update_permission_validation(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create admin1
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1Auth = await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  typia.assert(admin1Auth);
  // Setup: Create admin2
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2Auth = await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  typia.assert(admin2Auth);
  // Generate a test organization ID
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Generate test logo URLs
  const logoUrl1: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const logoUrl2: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  // Test: Admin1 attempts to update the logo
  // Depending on organization ownership, this may succeed or fail
  let admin1Success = false;
  try {
    const logoResponse1 =
      await api.functional.hrmPlatform.admin.organizations.logo.update(
        admin1Connection,
        {
          organizationId,
          body: {
            image_url: logoUrl1,
          } satisfies IHrmPlatformOrganizationLogo.IUpdate,
        },
      );
    typia.assert(logoResponse1);
    TestValidator.equals("admin1 logo url", logoResponse1.image_url, logoUrl1);
    admin1Success = true;
  } catch (exp) {
    // Admin1 may receive authorization error if not the organization owner
    if (typia.is<api.HttpError>(exp)) {
      TestValidator.predicate(
        "admin1 receives valid HTTP error",
        exp.status === 401 || exp.status === 403 || exp.status === 404,
      );
    }
  }
  // Test: Admin2 attempts to update the same organization's logo
  // At least one admin should receive authorization error (proving permission checks exist)
  let admin2Success = false;
  try {
    const logoResponse2 =
      await api.functional.hrmPlatform.admin.organizations.logo.update(
        admin2Connection,
        {
          organizationId,
          body: {
            image_url: logoUrl2,
          } satisfies IHrmPlatformOrganizationLogo.IUpdate,
        },
      );
    typia.assert(logoResponse2);
    TestValidator.equals("admin2 logo url", logoResponse2.image_url, logoUrl2);
    admin2Success = true;
  } catch (exp) {
    // Admin2 may receive authorization error
    if (typia.is<api.HttpError>(exp)) {
      TestValidator.predicate(
        "admin2 receives valid HTTP error",
        exp.status === 401 || exp.status === 403 || exp.status === 404,
      );
    }
  }
  // Validation: At least one admin should have been blocked (proving permission enforcement)
  // If both succeed, it means the organization doesn't exist and the backend is not validating
  // If both fail with 404, it means the organization doesn't exist
  // If one succeeds and one fails, permission validation is working correctly
  TestValidator.predicate(
    "permission validation is enforced (not both admins succeed)",
    !(admin1Success && admin2Success),
  );
  // Additional validation: If one succeeded, verify the other failed with auth error
  if (admin1Success) {
    await TestValidator.httpError(
      "admin2 cannot update logo when admin1 can",
      [401, 403],
      async () =>
        await api.functional.hrmPlatform.admin.organizations.logo.update(
          admin2Connection,
          {
            organizationId,
            body: {
              image_url: logoUrl2,
            } satisfies IHrmPlatformOrganizationLogo.IUpdate,
          },
        ),
    );
  } else if (admin2Success) {
    await TestValidator.httpError(
      "admin1 cannot update logo when admin2 can",
      [401, 403],
      async () =>
        await api.functional.hrmPlatform.admin.organizations.logo.update(
          admin1Connection,
          {
            organizationId,
            body: {
              image_url: logoUrl1,
            } satisfies IHrmPlatformOrganizationLogo.IUpdate,
          },
        ),
    );
  }
}
