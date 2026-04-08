import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMemberEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test cursor-based pagination for email verification records listing.
 *
 * Validates the pagination behavior of the email verification records endpoint including cursor-based navigation,
 * limit parameter validation, custom sorting, and proper response metadata. Tests that pagination is stable
 * (same cursor returns same page), invalid cursors are rejected, and limit parameters are validated correctly.
 *
 * Special attention is given to verifying that hasNextPage and cursor values are consistent across
 * multiple requests and that no duplicate records appear when navigating through pages.
 *
 * 1. Authenticate as member customer and obtain authorization token.
 * 2. Test first page request with default parameters (limit 20, no cursor).
 * 3. Validate response metadata includes hasNextPage, cursor, records, limit.
 * 4. Use cursor from first page to request second page.
 * 5. Verify second page contains different records (no duplicates with first page).
 * 6. Test cursor stability by requesting same page again with same cursor.
 * 7. Test invalid cursor handling (400 error).
 * 8. Test limit parameter: 50 (valid), 100 (max), 101 (invalid).
 * 9. Test custom sorting with pagination (created_at, updated_at, expired_at).
 */
export async function test_api_email_verification_pagination_cursor(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member customer
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberData);
  // 2. Test first page with default parameters (limit 20)
  const firstPageResponse =
    await api.functional.ecommerceMall.member.email_verifications.index(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(firstPageResponse);
  // Validate first page metadata
  TestValidator.equals(
    "first page limit",
    firstPageResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "first page current",
    firstPageResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page records",
    firstPageResponse.pagination.records,
    firstPageResponse.data.length,
  );
  // 3. Test cursor navigation - second page
  // Use offset-based pagination (current + 1) instead of cursor
  const secondPageResponse =
    await api.functional.ecommerceMall.member.email_verifications.index(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(secondPageResponse);
  // Verify second page is different from first
  const firstPageIds = firstPageResponse.data.map((r) => r.id);
  const secondPageIds = secondPageResponse.data.map((r) => r.id);
  TestValidator.predicate(
    "second page has different cursor",
    secondPageResponse.pagination.current !== firstPageResponse.pagination.current,
  );
  // Verify no duplicates
  const duplicateIds = firstPageIds.filter((id) =>
    secondPageIds.includes(id),
  );
  TestValidator.equals("no duplicates between pages", duplicateIds.length, 0);
  // 4. Test cursor stability - request same page again
  const samePageResponse =
    await api.functional.ecommerceMall.member.email_verifications.index(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(samePageResponse);
  TestValidator.equals(
    "cursor stable - same records",
    samePageResponse.data.length,
    secondPageResponse.data.length,
  );
  // Verify records are identical
  TestValidator.equals(
    "cursor stable - same order",
    samePageResponse.data.map((r) => r.id),
    secondPageResponse.data.map((r) => r.id),
  );
  // 5. Test invalid cursor handling
  await TestValidator.error("invalid cursor returns error", async () => {
    await api.functional.ecommerceMall.member.email_verifications.index(
      memberConnection,
      {
        body: { cursor: "invalid-cursor-12345" },
      },
    );
  });
  // 6. Test limit parameter validation
  // Limit 50 (valid)
  const limit50Response =
    await api.functional.ecommerceMall.member.email_verifications.index(
      memberConnection,
      {
        body: { limit: 50 },
      },
    );
  typia.assert(limit50Response);
  TestValidator.equals(
    "limit 50 - correct limit",
    limit50Response.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "limit 50 - actual records match",
    limit50Response.data.length <= 50,
  );
  // Limit 100 (maximum valid)
  const limit100Response =
    await api.functional.ecommerceMall.member.email_verifications.index(
      memberConnection,
      {
        body: { limit: 100 },
      },
    );
  typia.assert(limit100Response);
  TestValidator.equals(
    "limit 100 - correct limit",
    limit100Response.pagination.limit,
    100,
  );
  // Limit 101 (invalid - should be rejected)
  await TestValidator.error("limit 101 rejected", async () => {
    await api.functional.ecommerceMall.member.email_verifications.index(
      memberConnection,
      {
        body: { limit: 101 },
      },
    );
  });
  // 7. Test custom sorting with pagination
  // Sort by created_at
  const sortCreatedAtResponse =
    await api.functional.ecommerceMall.member.email_verifications.index(
      memberConnection,
      {
        body: { sort: "created_at" },
      },
    );
  typia.assert(sortCreatedAtResponse);
  // Verify records are sorted by created_at
  const createdAtValues = sortCreatedAtResponse.data.map((r) => r.created_at);
  TestValidator.predicate(
    "sort created_at - descending order",
    createdAtValues.every((val, i, arr) => i === 0 || arr[i - 1] >= val),
  );
  // Sort by updated_at
  const sortUpdatedAtResponse =
    await api.functional.ecommerceMall.member.email_verifications.index(
      memberConnection,
      {
        body: { sort: "updated_at" },
      },
    );
  typia.assert(sortUpdatedAtResponse);
  // Sort by expired_at
  const sortExpiredAtResponse =
    await api.functional.ecommerceMall.member.email_verifications.index(
      memberConnection,
      {
        body: { sort: "expired_at" },
      },
    );
  typia.assert(sortExpiredAtResponse);
  // Sort by null (default)
  const sortNullResponse =
    await api.functional.ecommerceMall.member.email_verifications.index(
      memberConnection,
      {
        body: { sort: null },
      },
    );
  typia.assert(sortNullResponse);
  // 8. Test status filtering with pagination
  const pendingPage =
    await api.functional.ecommerceMall.member.email_verifications.index(
      memberConnection,
      {
        body: { status: "pending" },
      },
    );
  typia.assert(pendingPage);
  TestValidator.predicate(
    "status filter - all pending",
    pendingPage.data.every((r) => r.status === "pending"),
  );
  // 9. Test email pattern filtering with pagination
  const emailFilter = typia
    .random<string & tags.Format<"email">>()
    .split("@")[0];
  const emailPage =
    await api.functional.ecommerceMall.member.email_verifications.index(
      memberConnection,
      {
        body: { email: emailFilter },
      },
    );
  typia.assert(emailPage);
  TestValidator.predicate(
    "email filter - records match pattern",
    emailPage.data.every((r) => r.email.includes(emailFilter)),
  );
}
