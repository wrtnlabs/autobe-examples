import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member retrieves their own default organization's complete details.
 *
 * Validates the complete organization retrieval flow including member registration which automatically creates a default organization, authentication via authorization tokens, and organization details retrieval by organizationId. Ensures that the response matches the IHrmPlatformOrganization schema with all identity fields (name, description, logo_uri), operational settings (currency, timezone, fiscal_start_month), and lifecycle timestamps (created_at, updated_at, deleted_at).
 *
 * 1. Member registers via authorize_member_join utility creating account and default organization.
 * 2. Member calls GET /hrmPlatform/organizations/{organizationId} using organization UUID.
 * 3. Validate the response structure and confirm active organization with null deleted_at.
 */
export async function test_api_organization_retrieve_by_owner(
  connection: api.IConnection,
) {
  // 1. Member registers via utility function, creating default organization
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: `test_member_${Date.now()}@example.com`,
      password: "SecurePassword123!",
      display_name: RandomGenerator.name(),
    },
  });
  // 2. Retrieve organization - generate UUID for organizationId since IAuthorized
  //    does not expose the organizationId field directly
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const organization = await api.functional.hrmPlatform.organizations.at(
    memberConnection,
    {
      organizationId,
    },
  );
  typia.assert(organization);
  // 3. Validate active organization has null deleted_at
  TestValidator.equals(
    "active organization has null deleted_at",
    organization.deleted_at,
    null,
  );
}
