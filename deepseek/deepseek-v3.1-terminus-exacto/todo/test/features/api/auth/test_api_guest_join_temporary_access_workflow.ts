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

export async function test_api_guest_join_temporary_access_workflow(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection and join
  const guestConnection: api.IConnection = { host: connection.host };
  const authorizedGuest = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  typia.assert(authorizedGuest);
  // Validate authorization token structure
  const token = authorizedGuest.token;
  typia.assert(token);
  // Verify connection headers are updated with access token
  TestValidator.equals(
    "Authorization header contains access token",
    guestConnection.headers?.Authorization,
    `Bearer ${token.access}`,
  );
  // Validate token expiration timeline makes sense
  const expiredAt = new Date(token.expired_at);
  const refreshableUntil = new Date(token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil > expiredAt,
  );
  // Validate guest account was created with proper timestamps
  const createdAt = new Date(authorizedGuest.created_at);
  const updatedAt = new Date(authorizedGuest.updated_at);
  TestValidator.predicate(
    "created_at and updated_at are close in time",
    Math.abs(createdAt.getTime() - updatedAt.getTime()) < 5000,
  );
  // Validate guest is not soft-deleted initially
  TestValidator.equals(
    "deleted_at should be undefined for new guest",
    authorizedGuest.deleted_at,
    undefined,
  );
}
