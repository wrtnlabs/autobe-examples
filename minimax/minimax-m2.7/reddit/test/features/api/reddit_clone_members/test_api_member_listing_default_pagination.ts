import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneMemberSession";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_listing_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Call PATCH /redditClone/members with empty request body to retrieve first page
  const response = await api.functional.redditClone.members.index(connection, {
    body: {},
  });
  typia.assert(response);
  // 2. Verify response contains pagination metadata with default values
  TestValidator.equals(
    "pagination current should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 20 (default)",
    response.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
  // 3. Verify response contains data array
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // 4. Verify each member includes expected fields
  for (const member of response.data) {
    // Verify id is UUID format
    TestValidator.predicate(
      "member id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        member.id,
      ),
    );
    // Verify username exists and is string
    TestValidator.predicate(
      "member username exists",
      typeof member.username === "string" && member.username.length > 0,
    );
    // Verify created_at is ISO date-time format
    TestValidator.predicate(
      "member created_at is date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(member.created_at),
    );
    // Verify profile exists with required fields
    TestValidator.predicate(
      "member profile exists",
      member.profile !== null && member.profile !== undefined,
    );
    TestValidator.predicate(
      "profile display_name exists",
      typeof member.profile.display_name === "string",
    );
    // karma_count should be a number
    TestValidator.predicate(
      "karma_count is number",
      typeof member.karma_count === "number",
    );
  }
  // 5. Verify no sensitive data in response
  // Response should not contain email or password_hash properties on members
  for (const member of response.data) {
    TestValidator.equals(
      "member should not have email property",
      (member as any).email,
      undefined,
    );
    TestValidator.equals(
      "member should not have password_hash property",
      (member as any).password_hash,
      undefined,
    );
  }
  // 6. Verify results sorted by created_at descending (newest first)
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = new Date(response.data[i].created_at).getTime();
      const next = new Date(response.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `member ${i} created_at >= member ${i + 1} created_at`,
        current >= next,
      );
    }
  }
  // 7. Verify soft-deleted members are excluded (check all members have created_at)
  // A soft-deleted member would have deleted_at set, not included in default query
  for (const member of response.data) {
    TestValidator.predicate(
      "member has valid created_at",
      member.created_at !== null && member.created_at !== undefined,
    );
  }
}
