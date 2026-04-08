import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account via join request
  const joinConnection: api.IConnection = { host: connection.host };
  const joined: IEcommerceMallAdmin.IAuthorized = await authorize_admin_join(
    joinConnection,
    {
      body: {
        actorType: "customer",
        requestedGrade: "admin",
        reason:
          "Need admin access for e2e testing of platform management features.",
        href: "https://example.com/admin/request",
        referrer: "https://example.com/",
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  typia.assert(joined);
  // Step 2: Use the same credentials to login
  const loginConnection: api.IConnection = { host: connection.host };
  const authorized: IEcommerceMallAdmin.IAuthorized =
    await authorize_admin_login(loginConnection, {
      body: {
        email: joined.email,
        password: "TestPassword123!",
        href: "https://example.com/admin/login",
        referrer: "https://example.com/admin/request",
      } satisfies IEcommerceMallAdmin.ILogin,
    });
  typia.assert(authorized);
  // Step 3: Validate response structure
  TestValidator.equals("id is valid UUID format", authorized.id.length, 36);
  TestValidator.equals("email matches input", authorized.email, joined.email);
  TestValidator.predicate(
    "name is non-empty string",
    authorized.name.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    !isNaN(Date.parse(authorized.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    !isNaN(Date.parse(authorized.updated_at)),
  );
  TestValidator.equals(
    "deleted_at is null for active account",
    authorized.deleted_at,
    null,
  );
  // Step 4: Validate token object
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
    !isNaN(Date.parse(authorized.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    !isNaN(Date.parse(authorized.token.refreshable_until)),
  );
}
