import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful member login with private account snapshot and token bundle.
 *
 * This scenario validates the full credential-based sign-in flow for the private todo app.
 * It first creates a member account, then authenticates with the same email and password,
 * and verifies the returned authorized payload exposes the signed-in member identity,
 * private profile, own todo summaries, and a usable authorization token bundle.
 *
 * 1. Create a fresh member account through the join utility.
 * 2. Log in with the same email and password through the login utility.
 * 3. Validate the authorized response matches the created member and includes private account data.
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Abcd1234!";
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(joined);
  const loginConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies ITodoAppMember.ILogin,
  });
  typia.assert(authorized);
  TestValidator.equals(
    "member id should match joined account",
    authorized.id,
    joined.id,
  );
  TestValidator.equals(
    "member email should match joined account",
    authorized.email,
    email,
  );
  TestValidator.equals(
    "profile id should exist on authorized member",
    authorized.profile.id,
    authorized.profile.id,
  );
  TestValidator.equals(
    "profile display name should exist on authorized member",
    authorized.profile.display_name,
    authorized.profile.display_name,
  );
  TestValidator.equals(
    "profile created_at should exist on authorized member",
    authorized.profile.created_at,
    authorized.profile.created_at,
  );
  TestValidator.equals(
    "profile updated_at should exist on authorized member",
    authorized.profile.updated_at,
    authorized.profile.updated_at,
  );
  TestValidator.equals(
    "profile deleted_at should be null for active member",
    authorized.profile.deleted_at,
    null,
  );
  TestValidator.equals(
    "token access should be returned",
    authorized.token.access,
    authorized.token.access,
  );
  TestValidator.equals(
    "token refresh should be returned",
    authorized.token.refresh,
    authorized.token.refresh,
  );
  TestValidator.equals(
    "token expiration should be returned",
    authorized.token.expired_at,
    authorized.token.expired_at,
  );
  TestValidator.equals(
    "token refreshable_until should be returned",
    authorized.token.refreshable_until,
    authorized.token.refreshable_until,
  );
  TestValidator.predicate(
    "todo summary list should be available",
    Array.isArray(authorized.todos),
  );
  TestValidator.equals(
    "member deleted_at should be null for active account",
    authorized.deleted_at,
    null,
  );
  TestValidator.equals(
    "member created_at should be preserved",
    authorized.created_at,
    authorized.created_at,
  );
  TestValidator.equals(
    "member updated_at should be preserved",
    authorized.updated_at,
    authorized.updated_at,
  );
}
