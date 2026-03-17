import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_registration_successful(
  connection: api.IConnection,
): Promise<void> {
  // Create guest-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate valid registration credentials
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IMultiUserTodoGuest.IJoin;
  // Execute guest registration via utility function
  const authorized: IMultiUserTodoGuest.IAuthorized =
    await authorize_guest_join(guestConnection, { body: joinInput });
  // Validate response structure
  typia.assert(authorized);
  // Validate response fields match input
  TestValidator.equals(
    "email matches input",
    authorized.email,
    joinInput.email,
  );
  TestValidator.predicate("has valid id", authorized.id.length > 0);
  TestValidator.predicate(
    "has created_at timestamp",
    authorized.created_at.length > 0,
  );
  // Validate token structure
  TestValidator.predicate(
    "token has access",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "token has refresh",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token has expired_at",
    authorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token has refreshable_until",
    authorized.token.refreshable_until.length > 0,
  );
}
