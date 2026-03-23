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
 * Test that only organization owners can update the logo.
 * A non-owner member attempting to update the organization logo should receive
 * a permission denied error (403 Forbidden).
 */
export async function test_api_organization_logo_update_permission_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate organization owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create and authenticate a non-owner member
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  const nonOwnerAuth = await authorize_member_join(nonOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(nonOwnerAuth);
  // 3. Use owner's organization ID (ownerAuth.id represents the member who owns an organization)
  // In a real scenario, we would have organization creation API to get the actual organization ID
  // For this test, we use the owner's member ID as a proxy for organization ID
  const organizationId = ownerAuth.id;
  // 4. Attempt to update the organization logo as non-owner
  // This should fail with 403 Forbidden because non-owner lacks permission
  await TestValidator.httpError(
    "non-owner cannot update organization logo",
    403,
    async () =>
      await api.functional.hrmPlatform.member.organizations.logo.update(
        nonOwnerConnection,
        {
          organizationId: organizationId,
          body: {
            image_url: typia.random<string & tags.Format<"uri">>(),
          } satisfies IHrmPlatformOrganizationLogo.IUpdate,
        },
      ),
  );
}
