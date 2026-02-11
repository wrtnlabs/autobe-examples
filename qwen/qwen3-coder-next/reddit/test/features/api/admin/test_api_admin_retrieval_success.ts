import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_admin_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random admin entity (as if retrieved from the database)
  const expectedAdmin: IRedditPlatformAdmin =
    typia.random<IRedditPlatformAdmin>();
  // Mock the server response by simulating the admin ID
  const retrievedAdmin = await api.functional.redditPlatform.admins.at(
    connection,
    { adminId: expectedAdmin.id },
  );
  typia.assert(retrievedAdmin);
  // Verify all expected fields are present and have correct structure
  TestValidator.predicate("has valid UUID", /^$uuid$/.test(retrievedAdmin.id));
  TestValidator.predicate(
    "has valid email format",
    /^$email$/.test(retrievedAdmin.email),
  );
  TestValidator.predicate(
    "has valid username",
    typeof retrievedAdmin.username === "string" &&
      retrievedAdmin.username.length > 0,
  );
  TestValidator.predicate(
    "has valid karma score",
    typeof retrievedAdmin.karmaScore === "number" &&
      retrievedAdmin.karmaScore >= 0,
  );
  TestValidator.predicate(
    "has valid date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedAdmin.createdAt),
  );
}
