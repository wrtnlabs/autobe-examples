import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_join_with_session_context(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for the super administrator join
  const joinConnection: api.IConnection = { host: connection.host };
  // Prepare the join payload with explicit session context: href, referrer, and ip
  const joinPayload: IDiscussionBoardSuperAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  };
  // Use the utility function to perform the super administrator join
  const authorized: IDiscussionBoardSuperAdministrator.IAuthorized =
    await authorize_super_administrator_join(joinConnection, {
      body: joinPayload,
    });
  // Validate the authorized response type
  typia.assert(authorized);
  // Validate the essential properties reflect input session context
  TestValidator.predicate(
    "Access token present",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "Refresh token present",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "CreatedAt timestamp is valid date-time",
    !isNaN(Date.parse(authorized.createdAt)),
  );
  TestValidator.predicate(
    "UpdatedAt timestamp is valid date-time",
    !isNaN(Date.parse(authorized.updatedAt)),
  );
  // Because the API only returns authorized and token info, and the session context is for backend auditing,
  // the values of href, referrer, and ip are not returned in the response.
  // We ensure the join succeeds and tokens exist.
  // Additional verification of stored session context is out of scope for E2E test and must be verified in integration tests.
}
