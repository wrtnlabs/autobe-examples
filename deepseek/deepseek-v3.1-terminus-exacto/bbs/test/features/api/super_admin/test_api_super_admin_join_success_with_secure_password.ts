import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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

export async function test_api_super_admin_join_success_with_secure_password(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for the super admin join operation
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Use the utility function for super admin join
  const response = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Validate the response using typia.assert
  typia.assert(response);
  // Verify the response structure contains required fields
  TestValidator.equals("response should have id", typeof response.id, "string");
  TestValidator.equals(
    "response should have email",
    typeof response.email,
    "string",
  );
  TestValidator.equals(
    "response should have permission_level",
    typeof response.permission_level,
    "string",
  );
  TestValidator.equals(
    "response should have privilege_level",
    typeof response.privilege_level,
    "string",
  );
  TestValidator.equals(
    "response should have token",
    typeof response.token,
    "object",
  );
  // Verify token structure
  TestValidator.equals(
    "token should have access",
    typeof response.token.access,
    "string",
  );
  TestValidator.equals(
    "token should have refresh",
    typeof response.token.refresh,
    "string",
  );
  TestValidator.equals(
    "token should have expired_at",
    typeof response.token.expired_at,
    "string",
  );
  TestValidator.equals(
    "token should have refreshable_until",
    typeof response.token.refreshable_until,
    "string",
  );
  // Verify super admin specific fields
  TestValidator.predicate(
    "superAdmin field should be present",
    response.superAdmin !== null,
  );
  TestValidator.predicate(
    "section field should be present",
    response.section !== null,
  );
  TestValidator.predicate(
    "assignment_date should be valid date string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(response.assignment_date),
  );
  TestValidator.predicate(
    "created_at should be valid date string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(response.created_at),
  );
  TestValidator.predicate(
    "updated_at should be valid date string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(response.updated_at),
  );
  // Verify that the connection headers were updated with the token
  TestValidator.predicate(
    "connection headers should contain authorization",
    superAdminConnection.headers?.Authorization !== undefined,
  );
}
