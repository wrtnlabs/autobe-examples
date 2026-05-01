import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator registration through the join endpoint with full response validation.
 *
 * Validates the complete administrator registration flow including account creation, session establishment, and JWT token issuance. Ensures that a new administrator can successfully register on the platform, receive proper authentication tokens, and be assigned the default "regular" grade.
 *
 * Special attention is given to verifying that the returned identity fields match the registration input (email), that both access and refresh tokens are issued as non-empty strings, and that token expiration timestamps are logically consistent with the refreshable_until timestamp occurring after the expired_at timestamp.
 *
 * 1. Create an administrator account with a unique email and session context fields.
 * 2. Validate the response contains matching email and "regular" grade.
 * 3. Verify JWT token pair is non-empty and expiration timestamps are logically ordered.
 */
export async function test_api_admin_join_success(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const output = await authorize_admin_join(adminConnection, {
    body: {
      email,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(output);
  TestValidator.equals("email matches input", output.email, email);
  TestValidator.equals("grade is regular", output.grade, "regular");
  TestValidator.predicate(
    "access token is non-empty",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    output.token.refresh.length > 0,
  );
  const expiredAt = new Date(output.token.expired_at).getTime();
  const refreshableUntil = new Date(output.token.refreshable_until).getTime();
  TestValidator.predicate(
    "expired_at is in the future",
    expiredAt > Date.now(),
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil > expiredAt,
  );
}
