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

export async function test_api_admin_join_success(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallAdmin.IJoin;
  const output = await authorize_admin_join(adminConnection, {
    body: joinInput,
  });
  typia.assert(output);
  TestValidator.predicate(
    "admin id matches UUID pattern",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      output.id,
    ),
  );
  TestValidator.equals("email matches input", output.email, joinInput.email);
  TestValidator.equals("admin is not banned", output.is_banned, false);
  TestValidator.equals("ban reason is null", output.ban_reason, null);
  TestValidator.predicate(
    "created_at is valid date-time",
    new Date(output.created_at).toISOString() === output.created_at,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    new Date(output.updated_at).toISOString() === output.updated_at,
  );
  TestValidator.predicate(
    "access token is non-empty string",
    typeof output.token.access === "string" && output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof output.token.refresh === "string" && output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    new Date(output.token.expired_at).toISOString() === output.token.expired_at,
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    new Date(output.token.refreshable_until).toISOString() ===
      output.token.refreshable_until,
  );
}
