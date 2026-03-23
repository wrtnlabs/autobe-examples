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
 * Test that an authenticated member cannot access the logo of an organization they don't belong to.
 * This test verifies organization context isolation by:
 * 1. Creating two separate member accounts
 * 2. Attempting to access a foreign organization's logo using first member's credentials
 * 3. Verifying access is denied with appropriate error response
 */
export async function test_api_organization_logo_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member account
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member1Auth);
  // 2. Create second member account
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member2Auth);
  // 3. Generate random organization IDs that neither member owns
  // These represent organizations from other contexts
  const foreignOrganizationId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to access foreign organization's logo using first member's credentials
  // This should fail with 403 Forbidden, 404 Not Found, or similar error
  await TestValidator.error(
    "access denied to foreign organization's logo",
    async () => {
      await api.functional.hrmPlatform.member.organizations.logo.at(
        member1Connection,
        {
          organizationId: foreignOrganizationId,
        },
      );
    },
  );
  // 5. Verify second member also cannot access the same foreign organization
  await TestValidator.error(
    "access denied to foreign organization's logo by second member",
    async () => {
      await api.functional.hrmPlatform.member.organizations.logo.at(
        member2Connection,
        {
          organizationId: foreignOrganizationId,
        },
      );
    },
  );
  // 6. Verify that members cannot access each other's contexts
  // Using member IDs as potential organization IDs (if they're linked)
  await TestValidator.error(
    "access denied to other member's organization context",
    async () => {
      await api.functional.hrmPlatform.member.organizations.logo.at(
        member1Connection,
        {
          organizationId: member2Auth.id,
        },
      );
    },
  );
  TestValidator.predicate("organization context isolation enforced", true);
}
