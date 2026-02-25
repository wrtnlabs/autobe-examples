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

export async function test_api_super_administrator_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Test the registration of a new superAdministrator user with valid unique email and valid password.
  // Create a new connection for superAdministrator join
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Prepare join request body
  const body: IDiscussionBoardSuperAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  };
  // Perform the join operation using the authorize utility function
  const authorized: IDiscussionBoardSuperAdministrator.IAuthorized =
    await authorize_super_administrator_join(superAdminConnection, { body });
  // Validate returned authorized object shape
  typia.assert(authorized);
  // Validate authorization token shape
  typia.assert(authorized.token);
  // Validate essential user properties
  TestValidator.predicate(
    "user id is uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );
  TestValidator.equals(
    "user email matches input",
    authorized.email,
    body.email,
  );
  TestValidator.predicate(
    "displayName is non empty",
    authorized.displayName.length > 0,
  );
  TestValidator.predicate(
    "createdAt is ISO datetime",
    !isNaN(Date.parse(authorized.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is ISO datetime",
    !isNaN(Date.parse(authorized.updatedAt)),
  );
  TestValidator.equals("deletedAt is null", authorized.deletedAt, null);
  // Validate tokens are non-empty strings
  TestValidator.predicate(
    "access token is non empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non empty",
    authorized.token.refresh.length > 0,
  );
  // Validate token timestamps are parseable dates
  TestValidator.predicate(
    "token expired_at is ISO datetime",
    !isNaN(Date.parse(authorized.token.expired_at)),
  );
  TestValidator.predicate(
    "token refreshable_until is ISO datetime",
    !isNaN(Date.parse(authorized.token.refreshable_until)),
  );
}
