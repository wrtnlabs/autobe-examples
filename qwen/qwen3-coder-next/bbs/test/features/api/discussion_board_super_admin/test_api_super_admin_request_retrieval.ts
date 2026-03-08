import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_request_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create a test administrator request (simulated through typia.random)
  // Since no API endpoint exists to create requests in the test database,
  // we use typia.random to generate a valid request structure for testing
  const testRequest = typia.random<IDiscussionBoardAdministratorRequest>();
  const requestId = testRequest.id;
  // 3. Retrieve the administrator request as super admin
  const request = await api.functional.discussionBoard.superAdmin.requests.at(
    superAdminConnection,
    {
      requestId,
    },
  );
  typia.assert(request);
  // 4. Validate response structure
  TestValidator.equals("has valid id", typeof request.id, "string");
  TestValidator.predicate(
    "id matches uuid format",
    /^[0-9a-f-]{36}$/i.test(request.id),
  );
  TestValidator.equals("has submitter", !!request.submitter, true);
  TestValidator.equals(
    "submitter has id",
    typeof request.submitter.id,
    "string",
  );
  TestValidator.equals(
    "submitter has display_name",
    typeof request.submitter.display_name,
    "string",
  );
  TestValidator.equals(
    "submitter has bio",
    typeof request.submitter.bio,
    "string",
  );
  TestValidator.equals("has status", request.status, "pending");
  TestValidator.equals("has reason", typeof request.reason, "string");
  TestValidator.equals(
    "has submitted_at",
    typeof request.submitted_at,
    "string",
  );
  TestValidator.predicate(
    "submitted_at is ISO date-time format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      request.submitted_at,
    ),
  );
  TestValidator.equals("has null processor (pending)", request.processor, null);
}
