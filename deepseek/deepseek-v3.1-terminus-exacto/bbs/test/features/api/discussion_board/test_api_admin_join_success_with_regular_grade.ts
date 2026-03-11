import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_join_success_with_regular_grade(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection object for the admin actor
  const adminConnection: api.IConnection = { host: connection.host };
  // Use the authorize_admin_join utility function to register a new administrator
  const result = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Validate the response structure using typia.assert
  typia.assert(result);
  // Verify business logic: admin grade is correctly set to 'regular' by default
  TestValidator.equals(
    "admin grade should be regular",
    result.admin_grade,
    "regular",
  );
  // Verify that deleted_at is null for active account
  TestValidator.equals(
    "deleted_at should be null for active account",
    result.deleted_at,
    null,
  );
  // Verify the connection headers were updated with the access token
  TestValidator.equals(
    "connection headers should be updated with access token",
    adminConnection.headers?.Authorization,
    result.token.access,
  );
}
