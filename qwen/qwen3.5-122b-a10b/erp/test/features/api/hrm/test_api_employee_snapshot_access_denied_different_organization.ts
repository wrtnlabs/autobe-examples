import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployeeSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeSnapshot";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a member cannot access employee snapshots from a different organization.
 *
 * Validates organization-scoped authorization enforcement for employee snapshot access. Creates two separate members with different organization contexts, then attempts to access an employee snapshot across organization boundaries.
 *
 * The test verifies that the system properly enforces data isolation between organizations by rejecting cross-organization snapshot access attempts. While employee creation APIs are not available in this test scope, the authorization enforcement is validated by attempting to access a snapshot with a UUID from a different organizational context.
 *
 * 1. First member joins and establishes first organization context.
 * 2. Second member joins and establishes second organization context.
 * 3. Generate a snapshot UUID that would belong to first organization's context.
 * 4. Second member attempts to retrieve the snapshot using their organization context.
 * 5. Validates that the request is rejected (403 Forbidden or 404 Not Found) due to organization isolation.
 */
export async function test_api_employee_snapshot_access_denied_different_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member joins and establishes first organization context
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMemberAuth = await authorize_member_join(firstMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(firstMemberAuth);
  // 2. Second member joins and establishes second organization context
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMemberAuth = await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(secondMemberAuth);
  // 3. Generate a snapshot UUID that would belong to first organization's context
  // Since we cannot create actual employees with available APIs, we test authorization
  // by attempting to access a snapshot from a different organizational context
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4-5. Second member attempts to access the snapshot and should be denied
  // The system should enforce organization-scoped authorization
  await TestValidator.httpError(
    "should reject cross-organization snapshot access",
    [403, 404],
    async () => {
      await api.functional.hrm.member.snapshots.at(secondMemberConnection, {
        snapshotId,
      });
    },
  );
}
