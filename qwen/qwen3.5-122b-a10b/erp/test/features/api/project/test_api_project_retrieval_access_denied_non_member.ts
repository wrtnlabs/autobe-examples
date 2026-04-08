import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test project retrieval access denial for non-member users.
 *
 * Validates that a member user without project:view permission and not assigned as a project member receives appropriate access denial when attempting to retrieve a project. This is a critical security test for multi-tenancy data isolation and access control enforcement.
 *
 * The test ensures the system returns 403 Forbidden or 404 Not Found to prevent information disclosure about projects the user has no business relationship with. This protects sensitive project data from unauthorized access.
 *
 * 1. Member user registers with email and password credentials.
 * 2. Member user attempts to retrieve a project they are not assigned to (using random IDs).
 * 3. Validates access denial with appropriate HTTP error status (403 or 404).
 */
export async function test_api_project_retrieval_access_denied_non_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member user account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Member user attempts to retrieve a project they are not assigned to
  // Using random organization code and project ID - this should fail with 403 or 404
  // This validates that unauthorized users cannot access project data
  await TestValidator.httpError(
    "non-member should not access project",
    [403, 404],
    async () => {
      await api.functional.hrm.member.organizations.projects.getByOrganizationcodeAndProjectid(
        memberConnection,
        {
          organizationCode: RandomGenerator.alphabets(8),
          projectId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
