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
 * Test organization logo creation when no logo exists.
 *
 * This test verifies that an admin can create a logo for an organization
 * that doesn't have one yet. The test authenticates as admin, sends a PUT
 * request to create the logo, and validates the response contains all
 * required fields with correct values.
 */
export async function test_api_organization_logo_create_when_not_exists(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication with isolated connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Generate organization ID for testing
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Generate logo image URL
  const imageUrl: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  // 2. Create logo for organization
  const logo: IHrmPlatformOrganizationLogo =
    await api.functional.hrmPlatform.admin.organizations.logo.update(
      adminConnection,
      {
        organizationId,
        body: {
          image_url: imageUrl,
        } satisfies IHrmPlatformOrganizationLogo.IUpdate,
      },
    );
  // 3. Validate response structure (complete type validation)
  typia.assert(logo);
  // 4. Validate business logic (not type/format - already validated by typia.assert)
  TestValidator.equals("image_url matches input", logo.image_url, imageUrl);
  TestValidator.equals("deleted_at is null (active)", logo.deleted_at, null);
  TestValidator.equals(
    "organization id matches",
    logo.organization.id,
    organizationId,
  );
  TestValidator.predicate("created_at exists", logo.created_at !== null);
  TestValidator.predicate("updated_at exists", logo.updated_at !== null);
  TestValidator.predicate("organization exists", logo.organization !== null);
}
