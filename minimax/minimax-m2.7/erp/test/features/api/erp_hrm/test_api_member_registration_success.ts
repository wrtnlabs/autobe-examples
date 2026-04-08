import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate unique registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name();
  // 2. Call member join endpoint
  const response = await api.functional.erpHrm.auth.member.join(connection, {
    body: {
      email,
      password,
      display_name: displayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmMember.IJoin,
  });
  // 3. Validate response with typia.assert
  typia.assert(response);
  // 4. Verify password_hash is NOT returned (security requirement)
  TestValidator.equals(
    "password_hash must not be in response",
    (response as any).password_hash,
    undefined,
  );
  // 5. Verify response fields
  TestValidator.equals("email matches input", response.email, email);
  TestValidator.equals(
    "display_name matches input",
    response.display_name,
    displayName,
  );
  TestValidator.equals(
    "displayName matches display_name",
    response.displayName,
    response.display_name,
  );
  // 6. Verify token structure
  TestValidator.predicate(
    "token.access exists",
    response.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh exists",
    response.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(response.token.expired_at),
  );
  TestValidator.predicate(
    "token.refreshable_until is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      response.token.refreshable_until,
    ),
  );
  // 7. Verify timestamps
  TestValidator.predicate(
    "created_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(response.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(response.updated_at),
  );
  // 8. Verify member can use the access token for authenticated requests
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers ??= {};
  authenticatedConnection.headers.Authorization = response.token.access;
  // Attempt duplicate registration with same email - should fail with conflict
  await TestValidator.error("duplicate email should fail", async () => {
    await api.functional.erpHrm.auth.member.join(connection, {
      body: {
        email,
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IErpHrmMember.IJoin,
    });
  });
}
