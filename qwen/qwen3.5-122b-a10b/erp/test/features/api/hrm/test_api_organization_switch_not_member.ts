import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a member user cannot switch to an organization they do not belong to.
 *
 * Validates the multi-tenancy security boundary by ensuring users cannot access data from organizations they are not members of. The test verifies that attempting to switch to a non-member organization returns a 403 Forbidden response, enforcing data isolation even with a valid authenticated session.
 *
 * The test flow ensures that:
 * 1. A new member is registered without any organization membership
 * 2. The member attempts to switch to an organization they don't belong to
 * 3. The system correctly rejects the request with appropriate error handling
 *
 * 1. Register a new member user with email and password credentials.
 * 2. Verify the member has no organizations in their membership list.
 * 3. Attempt to switch to a random organization UUID that the member doesn't belong to.
 * 4. Validate that a 403 Forbidden error is thrown, confirming data isolation enforcement.
 */
export async function test_api_organization_switch_not_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmMember.IJoin,
    },
  );
  typia.assert(memberAuth);
  // 2. Verify member has no organizations
  TestValidator.equals(
    "member has no organizations after join",
    memberAuth.organizations?.length ?? 0,
    0,
  );
  // 3. Attempt to switch to an organization the member doesn't belong to
  const nonMemberOrganizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Validate that 403 Forbidden error is thrown
  await TestValidator.httpError(
    "cannot switch to non-member organization",
    [403, 404],
    async () => {
      await api.functional.hrm.member.organizations._switch.select(
        memberConnection,
        {
          organizationId: nonMemberOrganizationId,
        },
      );
    },
  );
}
