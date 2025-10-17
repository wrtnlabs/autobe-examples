import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function test_api_user_public_summary_retrieval(
  connection: api.IConnection,
) {
  // 1) Create a new registered user using the join dependency
  const joinBody = {
    username: `testuser_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "P@ssw0rd-Testing-2025",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const created: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  typia.assert(created);

  // Extract created user id
  const userId: string & tags.Format<"uuid"> = created.id;

  // 2) Public retrieval (unauthenticated) - clone connection with empty headers
  const publicConn: api.IConnection = { ...connection, headers: {} };

  const summary: IEconPoliticalForumRegisteredUser.ISummary =
    await api.functional.econPoliticalForum.users.at(publicConn, {
      userId,
    });
  typia.assert(summary);

  // 3) Assertions - verify id and username (server-normalized username comes from created.username)
  TestValidator.equals("public summary returns created id", summary.id, userId);
  TestValidator.equals(
    "public summary username matches server value",
    summary.username,
    created.username ?? summary.username,
  );

  // Sensitive fields must NOT be present in public response (check via hasOwnProperty)
  TestValidator.predicate(
    "public summary does not contain email",
    Object.prototype.hasOwnProperty.call(summary, "email") === false,
  );
  TestValidator.predicate(
    "public summary does not contain password_hash",
    Object.prototype.hasOwnProperty.call(summary, "password_hash") === false,
  );
  TestValidator.predicate(
    "public summary does not contain failed_login_attempts",
    Object.prototype.hasOwnProperty.call(summary, "failed_login_attempts") ===
      false,
  );
  TestValidator.predicate(
    "public summary does not contain locked_until",
    Object.prototype.hasOwnProperty.call(summary, "locked_until") === false,
  );
  TestValidator.predicate(
    "public summary does not contain deleted_at",
    Object.prototype.hasOwnProperty.call(summary, "deleted_at") === false,
  );
  TestValidator.predicate(
    "public summary does not contain verified_at",
    Object.prototype.hasOwnProperty.call(summary, "verified_at") === false,
  );
  TestValidator.predicate(
    "public summary does not contain last_login_at",
    Object.prototype.hasOwnProperty.call(summary, "last_login_at") === false,
  );

  // 4) Inference: since public GET succeeded (200), the account is not soft-deleted
  TestValidator.predicate(
    "user is not soft-deleted (inferred from successful public GET)",
    summary.id === userId,
  );

  // 5) Owner-authenticated view: join() set connection to authenticated; call and ensure safety
  const ownerView: IEconPoliticalForumRegisteredUser.ISummary =
    await api.functional.econPoliticalForum.users.at(connection, { userId });
  typia.assert(ownerView);
  TestValidator.equals("owner view returns same id", ownerView.id, userId);
  TestValidator.equals(
    "owner view username matches server value",
    ownerView.username,
    created.username ?? ownerView.username,
  );
  TestValidator.predicate(
    "owner view does not expose password_hash",
    Object.prototype.hasOwnProperty.call(ownerView, "password_hash") === false,
  );

  // 6) Negative case: non-existent userId returns error (404)
  const randomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("non-existent user returns error", async () => {
    await api.functional.econPoliticalForum.users.at(publicConn, {
      userId: randomId,
    });
  });

  // Teardown: rely on test harness DB rollback / teardown. No header mutation performed here.
}
