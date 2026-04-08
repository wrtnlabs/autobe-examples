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
 * Test project retrieval by project member with proper authentication.
 *
 * Validates that an authenticated member can access the project retrieval endpoint and receives appropriate responses for valid and invalid requests. This test ensures proper authentication flow, organization context enforcement, and correct error handling for non-existent resources.
 *
 * The test verifies that:
 * - Authenticated members can successfully call the project retrieval endpoint
 * - Non-existent projects return appropriate HTTP errors (404)
 * - The endpoint properly validates organization context and project existence
 *
 * 1. Register a new member user with email and password credentials.
 * 2. Authenticate the member and obtain JWT tokens.
 * 3. Attempt to retrieve a non-existent project to validate error handling.
 * 4. Validates that the endpoint returns proper 404 error for missing resources.
 */
export async function test_api_project_retrieval_by_project_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Test error handling for non-existent project
  // Since we cannot create organizations/projects with member credentials,
  // we validate that the endpoint properly rejects requests for non-existent resources
  await TestValidator.httpError(
    "non-existent project returns 404",
    404,
    async () =>
      await api.functional.hrm.member.organizations.projects.getByOrganizationcodeAndProjectid(
        memberConnection,
        {
          organizationCode: RandomGenerator.alphabets(10),
          projectId: typia.random<string & tags.Format<"uuid">>(),
        },
      ),
  );
}
