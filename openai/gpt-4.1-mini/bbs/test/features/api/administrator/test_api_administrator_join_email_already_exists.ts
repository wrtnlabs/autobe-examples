import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_join_email_already_exists(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario for administrator registration attempt with an email address that already exists in the system.
  // Confirm that the registration fails gracefully with a meaningful error message indicating email duplication.
  // Verify that no new administrator account is created and no authorization tokens are issued.
  // Validate that this scenario enforces the uniqueness business rule on the email field as specified in the requirements.
  // Create a new connection for the first administrator registration
  const adminConnection1: api.IConnection = { host: connection.host };
  // Prepare a join body with random but realistic data
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.IJoin;
  // First administrator join should succeed
  const authorized = await authorize_administrator_join(adminConnection1, {
    body: joinBody,
  });
  typia.assert(authorized);
  // Create separate connection but reuse base host
  const adminConnection2: api.IConnection = { host: connection.host };
  // Attempt to join again with the same email should throw error
  await TestValidator.error("duplicate email causes join failure", async () => {
    await authorize_administrator_join(adminConnection2, { body: joinBody });
  });
}
