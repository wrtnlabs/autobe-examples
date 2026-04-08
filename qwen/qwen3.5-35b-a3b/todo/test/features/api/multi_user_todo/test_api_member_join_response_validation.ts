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

export async function test_api_member_join_response_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection for registration
  const memberConnection: api.IConnection = { host: connection.host };
  // Register new member with valid credentials
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IMultiUserTodoMember.IJoin;
  const result = await authorize_member_join(memberConnection, { body });
  typia.assert(result);
  // Validate IAuthorized identity fields
  TestValidator.equals(
    "id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      result.id,
    ),
    true,
  );
  TestValidator.equals(
    "email matches input",
    result.email,
    body.email.toLowerCase(),
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    result.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    result.updated_at !== undefined,
  );
  TestValidator.equals(
    "deleted_at is null for active account",
    result.deleted_at,
    null,
  );
  // Validate IAuthorizationToken structure
  typia.assert(result.token);
  TestValidator.equals(
    "access token is not empty",
    result.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token is not empty",
    result.token.refresh.length > 0,
    true,
  );
  TestValidator.predicate(
    "expired_at is defined",
    result.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "refreshable_until is defined",
    result.token.refreshable_until !== undefined,
  );
  // Validate access token JWT format (header.payload.signature)
  const jwtParts = result.token.access.split(".");
  TestValidator.equals("access token has 3 JWT parts", jwtParts.length, 3);
  TestValidator.predicate("JWT header is not empty", jwtParts[0].length > 0);
  TestValidator.predicate("JWT payload is not empty", jwtParts[1].length > 0);
  TestValidator.predicate("JWT signature is not empty", jwtParts[2].length > 0);
  // Validate token lifetimes (access expires before refreshable_until)
  const expiredAt = new Date(result.token.expired_at);
  const refreshableUntil = new Date(result.token.refreshable_until);
  TestValidator.predicate(
    "access expires before refreshable_until",
    expiredAt.getTime() < refreshableUntil.getTime(),
  );
  TestValidator.predicate(
    "expired_at is in the future",
    expiredAt.getTime() > new Date().getTime(),
  );
}