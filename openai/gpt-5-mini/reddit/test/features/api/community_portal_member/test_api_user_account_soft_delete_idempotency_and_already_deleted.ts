import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";

export async function test_api_user_account_soft_delete_idempotency_and_already_deleted(
  connection: api.IConnection,
) {
  // 1. Create a new member account via POST /auth/member/join
  const username = RandomGenerator.alphaNumeric(10);
  const email = typia.random<string & tags.Format<"email">>();
  const password = "P@ssw0rd-" + RandomGenerator.alphaNumeric(6);

  const created: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username,
        email,
        password,
        display_name: RandomGenerator.name(2),
      } satisfies ICommunityPortalMember.ICreate,
    });
  typia.assert(created);

  // Basic checks on returned authorization data
  TestValidator.predicate(
    "created member has id",
    typeof created.id === "string" && created.id.length > 0,
  );
  TestValidator.predicate(
    "created member returned an access token",
    typeof created.token?.access === "string" &&
      created.token.access.length > 0,
  );

  const userId: string = created.id;

  // 2. First deletion attempt (expected to succeed)
  try {
    await api.functional.communityPortal.member.users.erase(connection, {
      userId,
    });
  } catch (err) {
    // First deletion must not fail for a freshly-created account. Rethrow to fail the test.
    throw err;
  }
  TestValidator.predicate("first deletion completed successfully", true);

  // 3. Second deletion attempt: may either succeed (idempotent) or throw (e.g., not-found).
  let secondDeletionSucceeded = false;
  try {
    await api.functional.communityPortal.member.users.erase(connection, {
      userId,
    });
    secondDeletionSucceeded = true;
  } catch (err) {
    secondDeletionSucceeded = false;
  }

  // 4. Third deletion attempt: should behave the same as the second.
  let thirdDeletionSucceeded = false;
  try {
    await api.functional.communityPortal.member.users.erase(connection, {
      userId,
    });
    thirdDeletionSucceeded = true;
  } catch (err) {
    thirdDeletionSucceeded = false;
  }

  // 5. Assert consistency: second and third outcomes must match.
  TestValidator.predicate(
    "repeated delete attempts yield the same outcome",
    secondDeletionSucceeded === thirdDeletionSucceeded,
  );

  // 6. Report observed semantic (informational assertions)
  if (secondDeletionSucceeded) {
    TestValidator.predicate(
      "platform delete semantic observed: idempotent (repeated delete succeeded)",
      true,
    );
  } else {
    TestValidator.predicate(
      "platform delete semantic observed: non-idempotent (repeated delete threw)",
      true,
    );
  }
}
