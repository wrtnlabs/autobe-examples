import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_registration_with_email_verification(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate unique email for registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16); // Minimum 8 characters
  const name = RandomGenerator.name();
  const nickname = RandomGenerator.name();
  // Register new member using utility function
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      name,
      nickname,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // Validate response structure
  typia.assert(authorized);
  // Verify member identity fields match input
  TestValidator.equals("email matches input", authorized.email, email);
  TestValidator.equals("name matches input", authorized.name, name);
  TestValidator.equals("nickname matches input", authorized.nickname, nickname);
  // Verify timestamp fields are valid ISO 8601 format
  TestValidator.predicate(
    "created_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      authorized.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      authorized.updated_at,
    ),
  );
  TestValidator.predicate(
    "deleted_at is null for active account",
    authorized.deleted_at === null,
  );
  // Verify token structure and expiration timestamps
  TestValidator.predicate(
    "access token is non-empty string",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      authorized.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      authorized.token.refreshable_until,
    ),
  );
  TestValidator.predicate(
    "access token expires before refreshable until",
    authorized.token.expired_at < authorized.token.refreshable_until,
  );
  // Test duplicate email registration (business error)
  await TestValidator.error("duplicate email should fail", async () => {
    await authorize_member_join(memberConnection, {
      body: {
        email,
        password: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IMultiUserTodoMember.IJoin,
    });
  });
}
