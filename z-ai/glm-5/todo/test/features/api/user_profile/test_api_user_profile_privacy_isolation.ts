import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Verify privacy-first design principle enforcement - the response must
 * contain ONLY the display_name field. User joins and retrieves their profile,
 * then validate that no sensitive internal fields are exposed in the response.
 * Specifically verify that the response does NOT contain: id, email,
 * password_hash, failed_attempt_count, locked_until, created_at, updated_at,
 * deleted_at, or any other internal database columns.
 */
export async function test_api_user_profile_privacy_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // User joins and gets authenticated
  await authorize_user_join(userConnection, {});
  // Retrieve profile
  const profile = await api.functional.todoApp.user.profile.at(userConnection);
  typia.assert(profile);
  // Verify privacy-first design: response contains display_name
  TestValidator.predicate(
    "display_name exists in profile",
    "display_name" in profile,
  );
  // Verify sensitive internal fields are NOT exposed
  TestValidator.predicate("id not exposed in profile", !("id" in profile));
  TestValidator.predicate(
    "email not exposed in profile",
    !("email" in profile),
  );
  TestValidator.predicate(
    "password_hash not exposed in profile",
    !("password_hash" in profile),
  );
  TestValidator.predicate(
    "failed_attempt_count not exposed in profile",
    !("failed_attempt_count" in profile),
  );
  TestValidator.predicate(
    "locked_until not exposed in profile",
    !("locked_until" in profile),
  );
  TestValidator.predicate(
    "created_at not exposed in profile",
    !("created_at" in profile),
  );
  TestValidator.predicate(
    "updated_at not exposed in profile",
    !("updated_at" in profile),
  );
  TestValidator.predicate(
    "deleted_at not exposed in profile",
    !("deleted_at" in profile),
  );
  // Verify the only field in response is display_name
  const keys = Object.keys(profile);
  TestValidator.equals("profile has exactly one field", keys.length, 1);
  TestValidator.equals("sole field is display_name", keys[0], "display_name");
}
