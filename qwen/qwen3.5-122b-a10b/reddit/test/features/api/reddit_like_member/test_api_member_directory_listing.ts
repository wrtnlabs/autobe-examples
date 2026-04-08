import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeMember";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member directory listing with default pagination parameters.
 *
 * Validates the member directory endpoint by creating multiple member accounts and verifying the listing response structure. Ensures proper pagination metadata, correct field exposure, and sensitive data protection.
 *
 * 1. Create three member accounts with unique credentials to populate the member directory.
 * 2. Call the members listing endpoint with empty request body for default parameters.
 * 3. Verify response contains paginated member summaries with correct structure.
 * 4. Validate pagination metadata includes current page, limit, records count, and total pages.
 * 5. Ensure each member summary contains id, username, display_name, bio, avatar, karma_score, and created_at.
 * 6. Confirm sensitive data (email, password_hash) are not exposed in the response.
 */
export async function test_api_member_directory_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create three member accounts to populate the directory
  const member1 = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member1);
  const member2 = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member2);
  const member3 = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member3);
  // 2. Call the members listing endpoint with default parameters
  const result = await api.functional.redditLike.members.index(connection, {
    body: {} satisfies IRedditLikeMember.IRequest,
  });
  typia.assert(result);
  // 3. Verify pagination metadata structure
  TestValidator.predicate(
    "pagination has current page",
    result.pagination.current >= 0,
  );
  TestValidator.predicate("pagination has limit", result.pagination.limit > 0);
  TestValidator.predicate(
    "pagination has records count",
    result.pagination.records >= 3,
  );
  TestValidator.predicate(
    "pagination has total pages",
    result.pagination.pages >= 1,
  );
  // 4. Verify data array contains member summaries
  TestValidator.predicate("data array is not empty", result.data.length > 0);
  TestValidator.predicate("at least 3 members exist", result.data.length >= 3);
  // 5. Validate each member summary structure
  for (const member of result.data) {
    typia.assert(member);
    // Verify required fields exist
    TestValidator.predicate(
      "has valid id",
      member.id !== undefined && member.id !== null,
    );
    TestValidator.predicate(
      "has username",
      member.username !== undefined && member.username !== null,
    );
    TestValidator.predicate(
      "has display_name",
      member.display_name !== undefined && member.display_name !== null,
    );
    TestValidator.predicate(
      "has karma_score",
      member.karma_score !== undefined && member.karma_score !== null,
    );
    TestValidator.predicate(
      "has created_at",
      member.created_at !== undefined && member.created_at !== null,
    );
    // Verify optional fields can be null
    TestValidator.predicate(
      "bio is string or null",
      member.bio === null || typeof member.bio === "string",
    );
    TestValidator.predicate(
      "avatar is uri or null",
      member.avatar === null || typeof member.avatar === "string",
    );
    // Verify no sensitive data is exposed
    const memberKeys = Object.keys(member) as Array<keyof typeof member>;
    TestValidator.predicate(
      "no email field exposed",
      !memberKeys.includes("email" as any),
    );
    TestValidator.predicate(
      "no password_hash field exposed",
      !memberKeys.includes("password_hash" as any),
    );
  }
  // 6. Verify the created members are in the results
  const memberIds = result.data.map((m) => m.id);
  TestValidator.predicate(
    "member1 is in directory",
    memberIds.includes(member1.id),
  );
  TestValidator.predicate(
    "member2 is in directory",
    memberIds.includes(member2.id),
  );
  TestValidator.predicate(
    "member3 is in directory",
    memberIds.includes(member3.id),
  );
}
