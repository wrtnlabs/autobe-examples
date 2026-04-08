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
 * Test organization deletion requires owner authorization.
 *
 * Validates that only the organization owner can delete an organization by testing that a non-owner member attempting deletion receives a 403 Forbidden error. This ensures role-based access control properly restricts this critical permission.
 *
 * The test verifies the authorization check occurs before any deletion logic:
 * 1. Register a member who will attempt unauthorized deletion
 * 2. Attempt to delete an organization with a valid UUID that the member does not own
 * 3. Validate the system returns 403 Forbidden error
 *
 * This test ensures that even with valid authentication, the ownership verification prevents unauthorized organization deletion.
 */
export async function test_api_organization_deletion_authorization_required(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member (who is NOT an organization owner)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  // 2. Attempt to delete an organization the member does not own
  // Generate a random UUID for an organization that this member doesn't own
  const fakeOrganizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Verify the deletion attempt fails with 403 Forbidden
  await TestValidator.httpError(
    "non-owner cannot delete organization",
    403,
    async () => {
      await api.functional.hrm.member.organizations.erase(memberConnection, {
        organizationId: fakeOrganizationId,
      });
    },
  );
}
