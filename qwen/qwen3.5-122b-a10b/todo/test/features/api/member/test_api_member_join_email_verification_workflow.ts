import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the complete email verification workflow after member registration.
 * 1. Register a new member account with valid credentials
 * 2. Verify the response contains temporary access tokens
 * 3. Confirm account is created with all expected fields
 * 4. Validate token fields are properly populated
 */
export async function test_api_member_join_email_verification_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account with valid credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
      ip: typia.random<string & typia.tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Verify the response contains temporary access tokens
  TestValidator.predicate(
    "has access token",
    joinResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    joinResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has access token expiration",
    new Date(joinResult.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "has refreshable until timestamp",
    new Date(joinResult.token.refreshable_until) > new Date(),
  );
  // 3. Confirm account is created with all expected fields
  TestValidator.predicate("has member id", joinResult.id.length > 0);
  TestValidator.predicate(
    "has display name",
    joinResult.displayName.length > 0,
  );
  TestValidator.predicate(
    "has created at timestamp",
    new Date(joinResult.createdAt) <= new Date(),
  );
  TestValidator.predicate(
    "has updated at timestamp",
    new Date(joinResult.updatedAt) <= new Date(),
  );
  TestValidator.predicate("account not deleted", joinResult.deletedAt === null);
}
