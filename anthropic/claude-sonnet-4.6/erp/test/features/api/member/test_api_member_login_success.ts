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

export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique credentials for this test
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Login with the same credentials using a fresh connection
  const loginConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IErpHrmMember.ILogin,
  });
  // 3. Validate full type conformance
  typia.assert(authorized);
  // 4. Validate business logic
  // member.email must match registration email
  TestValidator.equals(
    "member email matches registration",
    authorized.member.email,
    email,
  );
  // member.deleted_at must be null (active account)
  TestValidator.equals(
    "member is active (deleted_at is null)",
    authorized.member.deleted_at,
    null,
  );
  // token.access must be a non-empty string
  TestValidator.predicate(
    "access token is non-empty",
    authorized.token.access.length > 0,
  );
  // token.refresh must be a non-empty string
  TestValidator.predicate(
    "refresh token is non-empty",
    authorized.token.refresh.length > 0,
  );
  // token.expired_at must be in the future
  const now = new Date();
  TestValidator.predicate(
    "access token expiry is in the future",
    new Date(authorized.token.expired_at) > now,
  );
  // token.refreshable_until must be in the future and after expired_at
  TestValidator.predicate(
    "refreshable_until is in the future",
    new Date(authorized.token.refreshable_until) > now,
  );
  TestValidator.predicate(
    "refreshable_until is further than expired_at",
    new Date(authorized.token.refreshable_until) >
      new Date(authorized.token.expired_at),
  );
}
