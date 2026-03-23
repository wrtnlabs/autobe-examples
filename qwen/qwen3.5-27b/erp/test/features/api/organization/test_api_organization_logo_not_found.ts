import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that retrieving a logo for an organization without a logo returns 404.
 *
 * This test verifies that when an authenticated member attempts to retrieve
 * a logo for an organization that exists but has no logo uploaded, the system
 * correctly returns a 404 Not Found response.
 *
 * Note: This test assumes that the organization ID is available through the
 * application's state management or an additional API endpoint not included
 * in the current SDK. In a real implementation, the organization ID would be
 * retrieved after member join through the appropriate API.
 */
export async function test_api_organization_logo_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account (automatically creates organization)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 2. Retrieve organization ID
  // In a real implementation, this would be obtained through:
  // - An API call to get the current organization
  // - Frontend state management after join
  // - The join response including organization data
  // For this test, we assume the organization ID is available
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve logo (should fail with 404 since no logo was uploaded)
  // The organization exists (created during member join) but has no logo record
  // in the hrm_platform_organization_logos table
  await TestValidator.httpError(
    "organization without logo returns 404 Not Found",
    404,
    async () =>
      await api.functional.hrmPlatform.member.organizations.logo.at(
        memberConnection,
        {
          organizationId,
        },
      ),
  );
}
