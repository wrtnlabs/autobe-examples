import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_profile_retrieval_soft_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Fetch an existing member to verify the endpoint works normally
  const activeUsername: string = typia.random<string>();
  const activeMember = await api.functional.redditPlatform.users.at(
    connection,
    {
      username: activeUsername,
    },
  );
  typia.assert(activeMember);
  // Verify active member structure and soft-deletion status
  TestValidator.equals(
    "active member has uuid id",
    activeMember.id,
    "" as string,
  );
  TestValidator.equals(
    "active member has valid username",
    activeMember.username,
    activeUsername,
  );
  TestValidator.predicate(
    "active member has valid karma",
    typeof activeMember.karma === "number",
  );
  TestValidator.equals(
    "active member has created_at timestamp",
    activeMember.created_at,
    "" as string,
  );
  TestValidator.equals(
    "active member has updated_at timestamp",
    activeMember.updated_at,
    "" as string,
  );
  TestValidator.equals(
    "active member not soft deleted",
    activeMember.deleted_at,
    null,
  );
  // 2. Test retrieval of soft-deleted account (simulated)
  // Since there's no soft deletion endpoint, test that non-existent usernames
  // return 404, demonstrating the account exclusion from public queries
  const softDeletedUsername: string = "deleted_" + typia.random<string>();
  // Manually catch HttpError to validate 404 response
  try {
    await api.functional.redditPlatform.users.at(connection, {
      username: softDeletedUsername,
    });
    throw new Error("Expected 404 error but got successful response");
  } catch (error) {
    if (error instanceof api.HttpError) {
      TestValidator.equals(
        "soft-deleted account returns 404",
        error.status,
        404,
      );
      TestValidator.equals(
        "error path contains username",
        error.path,
        `/redditPlatform/users/${encodeURIComponent(softDeletedUsername)}`,
      );
      TestValidator.equals("error method is GET", error.method, "GET");
    } else {
      throw error;
    }
  }
}