import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeMemberEmailVerification";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test email verification search endpoint with various filter combinations.
 *
 * Validates the administrative email verification search functionality by testing multiple filter scenarios including member ID, email address, date ranges, verification status, and soft-deleted record inclusion. Ensures that pagination metadata is correctly returned and that verification records contain all expected summary fields.
 *
 * The test creates a member account to generate email verification records, then exercises the search endpoint with different filter combinations to verify correct filtering behavior and response structure.
 *
 * 1. Register a new member account with randomized credentials.
 * 2. Create member-specific connection with authorization token.
 * 3. Search email verifications with no filters (baseline test).
 * 4. Search by member ID (exact match filter).
 * 5. Search by email address (partial match filter).
 * 6. Search by creation date range.
 * 7. Search by expiration date range.
 * 8. Search with status filter (pending).
 * 9. Test include_deleted flag for soft-deleted records.
 * 10. Validate pagination metadata structure and values.
 * 11. Validate each verification record contains expected fields.
 */
export async function test_api_email_verification_search_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string &
        tags.MinLength<8>,
      username: RandomGenerator.name(1) satisfies string &
        tags.MinLength<3> &
        tags.MaxLength<30>,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create member-specific connection for search
  const searchConnection: api.IConnection = { host: connection.host };
  // 3. Baseline search with no filters
  const baselineResult =
    await api.functional.redditLike.member.email_verifications.index(
      searchConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IRedditLikeMemberEmailVerification.IRequest,
      },
    );
  typia.assert(baselineResult);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    baselineResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    baselineResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    baselineResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    baselineResult.pagination.pages >= 0,
  );
  // 4. Search by member ID (exact match)
  const byMemberIdResult =
    await api.functional.redditLike.member.email_verifications.index(
      searchConnection,
      {
        body: {
          reddit_like_member_id: authorized.id,
          page: 1,
          limit: 100,
        } satisfies IRedditLikeMemberEmailVerification.IRequest,
      },
    );
  typia.assert(byMemberIdResult);
  // All results should belong to the same member
  for (const record of byMemberIdResult.data) {
    TestValidator.equals(
      "member ID matches filter",
      record.member.id,
      authorized.id,
    );
  }
  // 5. Search by email address (partial match)
  const partialEmail = authorized.email.substring(
    0,
    authorized.email.length - 3,
  );
  const byEmailResult =
    await api.functional.redditLike.member.email_verifications.index(
      searchConnection,
      {
        body: {
          email: partialEmail,
          page: 1,
          limit: 100,
        } satisfies IRedditLikeMemberEmailVerification.IRequest,
      },
    );
  typia.assert(byEmailResult);
  // All results should contain the partial email
  for (const record of byEmailResult.data) {
    TestValidator.predicate(
      "email contains filter value",
      record.email.includes(partialEmail),
    );
  }
  // 6. Search by creation date range
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  const byDateRangeResult =
    await api.functional.redditLike.member.email_verifications.index(
      searchConnection,
      {
        body: {
          created_at_from: oneHourAgo.toISOString(),
          created_at_to: oneHourFromNow.toISOString(),
          page: 1,
          limit: 100,
        } satisfies IRedditLikeMemberEmailVerification.IRequest,
      },
    );
  typia.assert(byDateRangeResult);
  // All results should be within the date range
  for (const record of byDateRangeResult.data) {
    const createdAt = new Date(record.created_at);
    TestValidator.predicate(
      "created_at >= created_at_from",
      createdAt >= oneHourAgo,
    );
    TestValidator.predicate(
      "created_at <= created_at_to",
      createdAt <= oneHourFromNow,
    );
  }
  // 7. Search by expiration date range
  const byExpiresAtResult =
    await api.functional.redditLike.member.email_verifications.index(
      searchConnection,
      {
        body: {
          expires_at_from: oneHourAgo.toISOString(),
          expires_at_to: oneHourFromNow.toISOString(),
          page: 1,
          limit: 100,
        } satisfies IRedditLikeMemberEmailVerification.IRequest,
      },
    );
  typia.assert(byExpiresAtResult);
  // All results should have expiration within range
  for (const record of byExpiresAtResult.data) {
    const expiresAt = new Date(record.expires_at);
    TestValidator.predicate(
      "expires_at >= expires_at_from",
      expiresAt >= oneHourAgo,
    );
    TestValidator.predicate(
      "expires_at <= expires_at_to",
      expiresAt <= oneHourFromNow,
    );
  }
  // 8. Search with status filter (pending)
  const byStatusResult =
    await api.functional.redditLike.member.email_verifications.index(
      searchConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 100,
        } satisfies IRedditLikeMemberEmailVerification.IRequest,
      },
    );
  typia.assert(byStatusResult);
  // All pending records should have deleted_at null and expires_at in future
  for (const record of byStatusResult.data) {
    TestValidator.predicate(
      "pending has null deleted_at",
      record.deleted_at === null,
    );
    const expiresAt = new Date(record.expires_at);
    TestValidator.predicate("pending expires in future", expiresAt > now);
  }
  // 9. Test include_deleted flag
  const withDeletedResult =
    await api.functional.redditLike.member.email_verifications.index(
      searchConnection,
      {
        body: {
          include_deleted: true,
          page: 1,
          limit: 100,
        } satisfies IRedditLikeMemberEmailVerification.IRequest,
      },
    );
  typia.assert(withDeletedResult);
  const withoutDeletedResult =
    await api.functional.redditLike.member.email_verifications.index(
      searchConnection,
      {
        body: {
          include_deleted: false,
          page: 1,
          limit: 100,
        } satisfies IRedditLikeMemberEmailVerification.IRequest,
      },
    );
  typia.assert(withoutDeletedResult);
  // with_deleted should return same or more records than without_deleted
  TestValidator.predicate(
    "include_deleted returns >= records",
    withDeletedResult.pagination.records >=
      withoutDeletedResult.pagination.records,
  );
  // 10. Validate record structure
  if (baselineResult.data.length > 0) {
    const sampleRecord = baselineResult.data[0];
    // Validate all required fields exist and have correct types
    TestValidator.predicate(
      "id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        sampleRecord.id,
      ),
    );
    TestValidator.predicate(
      "token is non-empty string",
      sampleRecord.token.length > 0,
    );
    TestValidator.predicate(
      "email is valid format",
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sampleRecord.email),
    );
    TestValidator.predicate(
      "expires_at is date-time",
      !isNaN(Date.parse(sampleRecord.expires_at)),
    );
    TestValidator.predicate(
      "created_at is date-time",
      !isNaN(Date.parse(sampleRecord.created_at)),
    );
    TestValidator.predicate(
      "updated_at is date-time",
      !isNaN(Date.parse(sampleRecord.updated_at)),
    );
    // Validate member summary structure
    TestValidator.predicate(
      "member.id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        sampleRecord.member.id,
      ),
    );
    TestValidator.predicate(
      "member.username is non-empty",
      sampleRecord.member.username.length > 0,
    );
    TestValidator.predicate(
      "member.display_name is non-empty",
      sampleRecord.member.display_name.length > 0,
    );
    TestValidator.predicate(
      "member.karma_score is number",
      typeof sampleRecord.member.karma_score === "number",
    );
    TestValidator.predicate(
      "member.created_at is date-time",
      !isNaN(Date.parse(sampleRecord.member.created_at)),
    );
  }
  // 11. Test sorting options
  const sortedByCreatedAtResult =
    await api.functional.redditLike.member.email_verifications.index(
      searchConnection,
      {
        body: {
          sort: "created_at",
          order: "desc",
          page: 1,
          limit: 100,
        } satisfies IRedditLikeMemberEmailVerification.IRequest,
      },
    );
  typia.assert(sortedByCreatedAtResult);
  // Verify descending order if multiple records exist
  if (sortedByCreatedAtResult.data.length > 1) {
    for (let i = 0; i < sortedByCreatedAtResult.data.length - 1; i++) {
      const current = new Date(sortedByCreatedAtResult.data[i].created_at);
      const next = new Date(sortedByCreatedAtResult.data[i + 1].created_at);
      TestValidator.predicate(
        `record ${i} >= record ${i + 1} (descending)`,
        current >= next,
      );
    }
  }
}
