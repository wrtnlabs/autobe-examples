import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_account_creation(
  connection: api.IConnection,
): Promise<void> {
  // Create admin account with random valid data
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(16),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph(),
    avatar_url: typia.random<string & tags.Format<"uri">>() ?? null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
  } satisfies IRedditPlatformAdmin.IJoin;
  const result = await authorize_admin_join(connection, { body: joinBody });
  typia.assert(result);
  // Validate admin profile exists and has data
  TestValidator.predicate("admin id exists", result.id !== "");
  TestValidator.predicate("admin email exists", result.email !== "");
  TestValidator.predicate("admin username exists", result.username !== "");
  TestValidator.predicate(
    "admin display name exists",
    result.display_name !== "",
  );
  TestValidator.predicate("admin bio exists", result.bio !== "");
  TestValidator.predicate("admin is active", result.is_active === true);
  TestValidator.predicate("created_at exists", result.created_at !== "");
  TestValidator.predicate("updated_at exists", result.updated_at !== "");
  // Validate optional profile fields are stored when provided
  if (joinBody.display_name) {
    TestValidator.equals(
      "display name matches input",
      result.display_name,
      joinBody.display_name,
    );
  }
  if (joinBody.bio) {
    TestValidator.equals("bio matches input", result.bio, joinBody.bio);
  }
  // Validate token structure exists and has data
  typia.assert(result.token);
  TestValidator.predicate(
    "access token exists",
    result.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    result.token.refresh.length > 0,
  );
  TestValidator.predicate("expired_at exists", result.token.expired_at !== "");
  TestValidator.predicate(
    "refreshable_until exists",
    result.token.refreshable_until !== "",
  );
  // Validate token expiration timestamps are valid date-time format
  TestValidator.predicate(
    "expired_at is ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.[\d]{3})?(Z|[+-]\d{2}:\d{2})?$/.test(
      result.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.[\d]{3})?(Z|[+-]\d{2}:\d{2})?$/.test(
      result.token.refreshable_until,
    ),
  );
}
