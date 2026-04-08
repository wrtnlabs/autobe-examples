import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_registration_minimal_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register with minimal required fields only (omit display_name and phone_number)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallMember.IJoin;
  const authorized = await api.functional.ecommerceMall.auth.member.join(
    connection,
    { body: joinBody },
  );
  typia.assert(authorized);
  // 2. Verify null values for optional profile fields in response
  TestValidator.equals("display_name is null", authorized.display_name, null);
  TestValidator.equals("phone_number is null", authorized.phone_number, null);
  // 3. Verify all required fields are present
  TestValidator.equals("email matches", authorized.email, joinBody.email);
  TestValidator.notEquals("member id exists", authorized.id, "");
  TestValidator.notEquals("created_at exists", authorized.created_at, "");
  TestValidator.notEquals("updated_at exists", authorized.updated_at, "");
  TestValidator.notEquals("access token exists", authorized.access, "");
  TestValidator.notEquals("refresh token exists", authorized.refresh, "");
  TestValidator.notEquals("expired_at exists", authorized.expired_at, "");
  TestValidator.notEquals("token object exists", authorized.token.access, "");
  // 4. Verify JWT token structure
  typia.assert(authorized.token);
  TestValidator.notEquals("token.access exists", authorized.token.access, "");
  TestValidator.notEquals("token.refresh exists", authorized.token.refresh, "");
  TestValidator.notEquals(
    "token.expired_at exists",
    authorized.token.expired_at,
    "",
  );
  TestValidator.notEquals(
    "token.refreshable_until exists",
    authorized.token.refreshable_until,
    "",
  );
  // 5. Verify token expiration timestamps are valid ISO 8601 format
  const parsedExpiredAt = new Date(authorized.expired_at);
  TestValidator.predicate(
    "expired_at is valid date",
    !isNaN(parsedExpiredAt.getTime()),
  );
  const parsedRefreshableUntil = new Date(authorized.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is valid date",
    !isNaN(parsedRefreshableUntil.getTime()),
  );
  // 6. Verify created_at and updated_at are valid dates
  const parsedCreatedAt = new Date(authorized.created_at);
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(parsedCreatedAt.getTime()),
  );
  const parsedUpdatedAt = new Date(authorized.updated_at);
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(parsedUpdatedAt.getTime()),
  );
  // 7. Verify access token expiration is in the future
  TestValidator.predicate(
    "expired_at is in future",
    parsedExpiredAt.getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refreshable_until is in future",
    parsedRefreshableUntil.getTime() > Date.now(),
  );
  // 8. Verify refreshable_until is after expired_at (token rotation support)
  TestValidator.predicate(
    "refreshable_until >= expired_at",
    parsedRefreshableUntil.getTime() >= parsedExpiredAt.getTime(),
  );
}
