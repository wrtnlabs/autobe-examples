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
 * Test organization logo update workflow.
 * 1. Admin authenticates and creates actor-specific connection
 * 2. Admin updates an existing organization logo with new image URL
 * 3. Verify the updated logo response contains correct fields and relationships
 */
export async function test_api_organization_logo_update_existing(
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
  // 2. Generate test data
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const newImageUrl: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  // 3. Update organization logo
  const updatedLogo: IHrmPlatformOrganizationLogo =
    await api.functional.hrmPlatform.admin.organizations.logo.update(
      adminConnection,
      {
        organizationId,
        body: {
          image_url: newImageUrl,
        } satisfies IHrmPlatformOrganizationLogo.IUpdate,
      },
    );
  typia.assert(updatedLogo);
  // 4. Validate business logic (typia.assert() already validates types)
  TestValidator.equals(
    "image_url matches request",
    updatedLogo.image_url,
    newImageUrl,
  );
  TestValidator.equals(
    "organization id matches",
    updatedLogo.organization.id,
    organizationId,
  );
  TestValidator.predicate("updated_at is after or equal to created_at", () => {
    return new Date(updatedLogo.updated_at) >= new Date(updatedLogo.created_at);
  });
  TestValidator.equals(
    "deleted_at is null for active logo",
    updatedLogo.deleted_at,
    null,
  );
}
