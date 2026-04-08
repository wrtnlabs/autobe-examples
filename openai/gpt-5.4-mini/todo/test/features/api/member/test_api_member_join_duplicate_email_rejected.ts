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
 * Rejects duplicate member registration when the same email is used twice.
 *
 * This test validates the account uniqueness rule for the private todo app's
 * member sign-up flow. It registers one member successfully, then attempts to
 * create a second account with the same email address and verifies the server
 * rejects the request.
 *
 * The test also confirms that the original member snapshot remains unchanged
 * after the failed duplicate attempt, including the member identity, profile
 * data, and returned authorization token bundle.
 *
 * 1. Create an initial member account with a unique email address.
 * 2. Attempt a second sign-up using the same email address.
 * 3. Verify the duplicate request is rejected and the original account data remains stable.
 */
export async function test_api_member_join_duplicate_email_rejected(
  connection: api.IConnection,
): Promise<void> {
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(12);
  const memberConnection: api.IConnection = { host: connection.host };
  const created = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(created);
  const snapshot = {
    id: created.id,
    email: created.email,
    profile: {
      id: created.profile.id,
      display_name: created.profile.display_name,
      created_at: created.profile.created_at,
      updated_at: created.profile.updated_at,
      deleted_at: created.profile.deleted_at,
    },
    todoCount: created.todos.length,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at,
    token: {
      access: created.token.access,
      refresh: created.token.refresh,
      expired_at: created.token.expired_at,
      refreshable_until: created.token.refreshable_until,
    },
  };
  await TestValidator.httpError(
    "duplicate member email registration should be rejected",
    [400, 409],
    async () => {
      const duplicateConnection: api.IConnection = { host: connection.host };
      await api.functional.todoApp.auth.member.join(duplicateConnection, {
        body: {
          email,
          password: RandomGenerator.alphaNumeric(12),
        } satisfies ITodoAppMember.IJoin,
      });
    },
  );
  TestValidator.equals(
    "original member id should remain stable",
    created.id,
    snapshot.id,
  );
  TestValidator.equals(
    "original member email should remain stable",
    created.email,
    snapshot.email,
  );
  TestValidator.equals(
    "original profile id should remain stable",
    created.profile.id,
    snapshot.profile.id,
  );
  TestValidator.equals(
    "original profile display name should remain stable",
    created.profile.display_name,
    snapshot.profile.display_name,
  );
  TestValidator.equals(
    "original profile created_at should remain stable",
    created.profile.created_at,
    snapshot.profile.created_at,
  );
  TestValidator.equals(
    "original profile updated_at should remain stable",
    created.profile.updated_at,
    snapshot.profile.updated_at,
  );
  TestValidator.equals(
    "original profile deleted_at should remain stable",
    created.profile.deleted_at,
    snapshot.profile.deleted_at,
  );
  TestValidator.equals(
    "original todo count should remain stable",
    created.todos.length,
    snapshot.todoCount,
  );
  TestValidator.equals(
    "original account created_at should remain stable",
    created.created_at,
    snapshot.created_at,
  );
  TestValidator.equals(
    "original account updated_at should remain stable",
    created.updated_at,
    snapshot.updated_at,
  );
  TestValidator.equals(
    "original account deleted_at should remain stable",
    created.deleted_at,
    snapshot.deleted_at,
  );
  TestValidator.equals(
    "original token access should remain stable",
    created.token.access,
    snapshot.token.access,
  );
  TestValidator.equals(
    "original token refresh should remain stable",
    created.token.refresh,
    snapshot.token.refresh,
  );
  TestValidator.equals(
    "original token expired_at should remain stable",
    created.token.expired_at,
    snapshot.token.expired_at,
  );
  TestValidator.equals(
    "original token refreshable_until should remain stable",
    created.token.refreshable_until,
    snapshot.token.refreshable_until,
  );
}
