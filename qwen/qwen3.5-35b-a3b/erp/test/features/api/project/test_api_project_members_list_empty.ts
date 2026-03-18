import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProjectMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsProjectMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the edge case where a project has no assigned members (or project doesn't exist).
 *
 * 1. Create a member account and authenticate
 * 2. Create a new connection with the authenticated member's token
 * 3. Call the project members list endpoint with a random UUID as projectId
 * 4. Validate response structure with empty data array and valid pagination metadata
 * 5. Ensure the endpoint handles gracefully without throwing errors
 */
export async function test_api_project_members_list_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a new connection with the authenticated member's token
  const testConnection: api.IConnection = { host: connection.host };
  testConnection.headers = {
    ...testConnection.headers,
    Authorization: memberAuth.token.access,
  };
  // 3. Call the project members list endpoint with a random UUID as projectId
  const projectId = typia.random<string & tags.Format<"uuid">>();
  const response = await api.functional.hrms.member.projects.members.index(
    testConnection,
    {
      projectId: projectId,
      body: { metric: typia.random<any>() } satisfies IHrmsProjectMember.IRequest,
    },
  );
  typia.assert(response);
  // 4. Validate response structure
  const pagination = response.pagination;
  TestValidator.equals("current page is 1", pagination.current, 1);
  TestValidator.equals("limit is 100", pagination.limit, 100);
  TestValidator.equals("total records is 0", pagination.records, 0);
  TestValidator.equals("total pages is 0", pagination.pages, 0);
  // 5. Validate data array is empty
  TestValidator.equals("data array is empty", response.data.length, 0);
  TestValidator.equals("data is array", Array.isArray(response.data), true);
}