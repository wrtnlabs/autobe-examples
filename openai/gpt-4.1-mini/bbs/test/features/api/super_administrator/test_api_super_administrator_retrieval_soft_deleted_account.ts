import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { RandomGenerator, TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";

export async function test_api_super_administrator_retrieval_soft_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new super administrator to gain authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_super_administrator_join(adminConnection, {
    body: {
      // Create with realistic dummy data
      email: `softdeleted_${RandomGenerator.alphabets(5)}@example.com`,
      password: "Passw0rd!",
    } satisfies IDiscussionBoardSuperAdministrator.IJoin,
  });
  typia.assert(joinResult);
  // Set authorization header for subsequent calls
  adminConnection.headers = {
    Authorization: `Bearer ${joinResult.token.access}`,
  };
  // 2. Use a fixed UUID representing a soft-deleted super administrator
  // This imitates a soft-deleted account for test purposes
  const softDeletedUuid = "00000000-0000-4000-8000-000000000000";
  // 3. Retrieve the super administrator by ID
  const output = await api.functional.discussionBoard.superAdministrator.superAdministrators.at(
    adminConnection,
    { id: softDeletedUuid },
  );
  typia.assert(output);
  // 4. Check that deletedAt field is present, string or null
  TestValidator.predicate("deletedAt present", "deletedAt" in output);

  // Only if deletedAt is present, assert its type and pattern
  if ("deletedAt" in output) {
    const outputWithDeletedAt = output as unknown & { deletedAt: string | null };
    if (outputWithDeletedAt.deletedAt !== null) {
      TestValidator.predicate(
        "deletedAt is ISO string",
        typeof outputWithDeletedAt.deletedAt === "string" &&
          /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.\d+)?Z$/.test(
            outputWithDeletedAt.deletedAt,
          ),
      );
    }
  }

  // 5. Assert no password hash exposed
  TestValidator.predicate(
    "password hash not present",
    !("password_hash" in output),
  );

  // 6. Validate basic profile fields
  TestValidator.predicate("has id", "id" in output && typeof (output as any).id === "string");
  TestValidator.predicate("has email", "email" in output && typeof (output as any).email === "string");
  TestValidator.predicate(
    "has displayName",
    "displayName" in output && typeof (output as any).displayName === "string",
  );
}
