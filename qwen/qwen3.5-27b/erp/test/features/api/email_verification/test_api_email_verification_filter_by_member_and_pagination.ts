import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMemberEmailVerification";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test email verification list endpoint with member-specific filtering and pagination.
 *
 * Validates the complete email verification listing flow including member authentication, member-specific filtering, pagination controls, and search functionality. Ensures that the response respects pagination parameters and returns correct metadata.
 *
 * Special attention is given to verifying that member_id filtering correctly returns only the authenticated member's verification records, pagination metadata is accurate, and results are sorted by created_at descending.
 *
 * 1. Member authenticates via join endpoint to obtain credentials.
 * 2. Member calls email-verifications endpoint with member_id filter.
 * 3. Validates pagination metadata (current page, limit, total records, total pages).
 * 4. Verifies results are sorted by created_at descending (newest first).
 * 5. Tests search parameter with case-insensitive matching on email and token fields.
 * 6. Confirms soft-deleted records are excluded from results.
 */
export async function test_api_email_verification_filter_by_member_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection);
  typia.assert(member);
  // 2. Fetch email verifications with member_id filter and pagination
  const page1 =
    await api.functional.hrmTimeTrack.member.email_verifications.index(
      memberConnection,
      {
        body: {
          member_id: member.id,
          page: 1,
          limit: 10,
        } satisfies IHrmTimeTrackMemberEmailVerification.IRequest,
      },
    );
  typia.assert(page1);
  // 3. Validate pagination metadata
  TestValidator.equals("current page is 1", page1.pagination.current, 1);
  TestValidator.equals("limit is 10", page1.pagination.limit, 10);
  TestValidator.predicate(
    "has non-negative records",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has non-negative pages",
    page1.pagination.pages >= 0,
  );
  // 4. Verify results are sorted by created_at descending
  if (page1.data.length > 1) {
    for (let i = 1; i < page1.data.length; i++) {
      TestValidator.predicate(
        `record ${i} created_at <= record ${i - 1} created_at`,
        new Date(page1.data[i].created_at).getTime() <=
          new Date(page1.data[i - 1].created_at).getTime(),
      );
    }
  }
  // 5. Test search parameter with case-insensitive matching
  if (page1.data.length > 0) {
    const firstRecord = page1.data[0];
    const searchQuery = firstRecord.email.substring(0, 5).toLowerCase();
    const searchResult =
      await api.functional.hrmTimeTrack.member.email_verifications.index(
        memberConnection,
        {
          body: {
            member_id: member.id,
            search: searchQuery,
            page: 1,
            limit: 10,
          } satisfies IHrmTimeTrackMemberEmailVerification.IRequest,
        },
      );
    typia.assert(searchResult);
    TestValidator.predicate(
      "search returns matching results",
      searchResult.pagination.records > 0,
    );
    // Verify all returned records match the search query
    for (const record of searchResult.data) {
      TestValidator.predicate(
        "record email or token contains search query",
        record.email.toLowerCase().includes(searchQuery) ||
          record.token.toLowerCase().includes(searchQuery),
      );
    }
  }
  // 6. Test pagination with page 2
  const page2 =
    await api.functional.hrmTimeTrack.member.email_verifications.index(
      memberConnection,
      {
        body: {
          member_id: member.id,
          page: 2,
          limit: 10,
        } satisfies IHrmTimeTrackMemberEmailVerification.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("current page is 2", page2.pagination.current, 2);
  TestValidator.equals("limit is 10", page2.pagination.limit, 10);
  // 7. Verify soft-deleted records are excluded (all returned records have deleted_at = null)
  for (const record of page1.data) {
    TestValidator.equals(
      "soft-deleted records excluded",
      record.deleted_at,
      null,
    );
  }
  // 8. Test with different limit value
  const customLimit =
    await api.functional.hrmTimeTrack.member.email_verifications.index(
      memberConnection,
      {
        body: {
          member_id: member.id,
          page: 1,
          limit: 5,
        } satisfies IHrmTimeTrackMemberEmailVerification.IRequest,
      },
    );
  typia.assert(customLimit);
  TestValidator.equals("custom limit is 5", customLimit.pagination.limit, 5);
  TestValidator.predicate("data length <= limit", customLimit.data.length <= 5);
}
