import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
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
 * Test that an authenticated member cannot retrieve organization settings for an organization they do not belong to.
 * This validates organization-scoped authority enforcement and multi-tenancy isolation.
 */
export async function test_api_organization_settings_retrieve_unauthorized_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first member (member1)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member1);
  // 2. Register second member (member2) - different member account
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member2);
  // 3. Generate a random organization ID that member2 doesn't belong to
  const unauthorizedOrganizationId = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Attempt to retrieve organization settings for unauthorized organization using member2's connection
  // This should fail with 401 (Unauthorized), 403 (Forbidden), or 404 (Not Found)
  await TestValidator.httpError(
    "unauthorized organization access should be rejected",
    [401, 403, 404],
    async () => {
      await api.functional.hrmPlatform.member.organizations.settings.at(
        member2Connection,
        {
          organizationId: unauthorizedOrganizationId,
        },
      );
    },
  );
}
