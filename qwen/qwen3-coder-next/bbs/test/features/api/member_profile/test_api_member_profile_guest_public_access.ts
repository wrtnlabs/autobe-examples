import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_profile_guest_public_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest-specific connection (even though no auth required)
  const guestConnection: api.IConnection = { host: connection.host };
  // 2. Generate a random member ID for testing
  const memberId = typia.random<string & tags.Format<"uuid">>();
  // 3. Guest accesses member profile (no authentication required)
  const profile = await api.functional.discussionBoard.members.at(
    guestConnection,
    {
      memberId,
    },
  );
  // 4. Validate response structure and types
  typia.assert<IDiscussionBoardMember>(profile);
  // 5. Verify all public fields are present with correct types
  TestValidator.equals("id is UUID string", typeof profile.id, "string");
  TestValidator.predicate(
    "id matches UUID format",
    /^[0-9a-f-]{36}$/i.test(profile.id),
  );
  TestValidator.equals("email is string", typeof profile.email, "string");
  TestValidator.predicate(
    "email matches format",
    /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(
      profile.email,
    ),
  );
  TestValidator.equals(
    "displayName is string",
    typeof profile.displayName,
    "string",
  );
  TestValidator.notEquals("displayName is not empty", profile.displayName, "");
  TestValidator.equals(
    "createdAt is string",
    typeof profile.createdAt,
    "string",
  );
  TestValidator.predicate(
    "createdAt is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(profile.createdAt),
  );
  // 6. Verify administrative fields are present (API returns complete DTO)
  TestValidator.equals(
    "isActive is boolean",
    typeof profile.isActive,
    "boolean",
  );
  TestValidator.equals("isAdmin is boolean", typeof profile.isAdmin, "boolean");
  TestValidator.equals(
    "isSuperAdmin is boolean",
    typeof profile.isSuperAdmin,
    "boolean",
  );
  // 7. Verify optional bio field (null, string, or undefined)
  TestValidator.predicate(
    "bio is valid type",
    profile.bio === null ||
      typeof profile.bio === "string" ||
      profile.bio === undefined,
  );
}
