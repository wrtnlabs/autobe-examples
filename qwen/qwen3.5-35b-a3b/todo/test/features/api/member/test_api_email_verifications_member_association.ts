import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberEmailVerification";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_email_verifications_member_association(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account (generates email verification records)
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create a second member for testing member-specific filtering
  const joinConnection2: api.IConnection = { host: connection.host };
  const memberAuth2 = await authorize_member_join(joinConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth2);
  // 3. Test email verifications endpoint with member association
  const verifyConnection: api.IConnection = { host: connection.host };
  verifyConnection.headers = { Authorization: memberAuth.token.access };
  const verifications =
    await api.functional.todoApp.member.email_verifications.index(
      verifyConnection,
      {
        body: {},
      },
    );
  typia.assert(verifications);
  // 4. Validate member association in each verification record
  for (const verification of verifications.data) {
    TestValidator.equals(
      "verification has member.id",
      verification.member.id,
      memberAuth.id,
    );
    TestValidator.equals(
      "verification has member.email",
      verification.member.email,
      memberAuth.email,
    );
    TestValidator.equals(
      "verification has member.displayName",
      verification.member.displayName,
      memberAuth.display_name,
    );
    // Verify member association is complete ISummary structure
    TestValidator.predicate(
      "member has createdAt timestamp",
      () => typeof verification.member.createdAt === "string",
    );
    TestValidator.predicate(
      "member has deletedAt field",
      () =>
        verification.member.deletedAt === null ||
        typeof verification.member.deletedAt === "string",
    );
  }
  // 5. Test filtering by memberId (should return only that member's verifications)
  const memberIdFilter: api.IConnection = { host: connection.host };
  memberIdFilter.headers = { Authorization: memberAuth.token.access };
  const memberSpecificVerifications =
    await api.functional.todoApp.member.email_verifications.index(
      memberIdFilter,
      {
        body: {
          memberId: memberAuth.id,
        },
      },
    );
  typia.assert(memberSpecificVerifications);
  // All returned verifications should be for the specified member
  for (const verification of memberSpecificVerifications.data) {
    TestValidator.equals(
      "filter by memberId returns correct member.id",
      verification.member.id,
      memberAuth.id,
    );
  }
  // 6. Test filtering by memberEmail (partial match)
  const emailFilter: api.IConnection = { host: connection.host };
  emailFilter.headers = { Authorization: memberAuth.token.access };
  // Extract email domain for partial match testing
  const emailDomain = memberAuth.email.split("@")[1];
  const emailFilterResult =
    await api.functional.todoApp.member.email_verifications.index(emailFilter, {
      body: {
        memberEmail: emailDomain ?? "",
      },
    });
  typia.assert(emailFilterResult);
  // All returned verifications should have emails containing the filter
  for (const verification of emailFilterResult.data) {
    TestValidator.predicate(
      "memberEmail filter matches",
      () =>
        emailDomain !== undefined &&
        verification.member.email.includes(emailDomain),
    );
  }
  // 7. Test filtering by status
  const statusFilter: api.IConnection = { host: connection.host };
  statusFilter.headers = { Authorization: memberAuth.token.access };
  const statusFilteredVerifications =
    await api.functional.todoApp.member.email_verifications.index(
      statusFilter,
      {
        body: {
          status: "pending",
        },
      },
    );
  typia.assert(statusFilteredVerifications);
  // 8. Test filtering by createdAfter date range
  const dateFilter: api.IConnection = { host: connection.host };
  dateFilter.headers = { Authorization: memberAuth.token.access };
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const dateFilteredVerifications =
    await api.functional.todoApp.member.email_verifications.index(dateFilter, {
      body: {
        createdAfter: oneHourAgo,
      },
    });
  typia.assert(dateFilteredVerifications);
  // 9. Test pagination preserves member association
  const paginationConnection: api.IConnection = { host: connection.host };
  paginationConnection.headers = { Authorization: memberAuth.token.access };
  const paginatedResult =
    await api.functional.todoApp.member.email_verifications.index(
      paginationConnection,
      {
        body: {
          pageSize: 10,
        },
      },
    );
  typia.assert(paginatedResult);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination has current",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination has limit",
    paginatedResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination has records",
    () => paginatedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    () => paginatedResult.pagination.pages >= 0,
  );
  // Validate each page item has member association
  for (const verification of paginatedResult.data) {
    TestValidator.predicate(
      "paginated item has member.id",
      () =>
        verification.member.id !== undefined && verification.member.id !== null,
    );
  }
  // 10. Test combined filters (memberId + status)
  const combinedFilter: api.IConnection = { host: connection.host };
  combinedFilter.headers = { Authorization: memberAuth.token.access };
  const combinedVerifications =
    await api.functional.todoApp.member.email_verifications.index(
      combinedFilter,
      {
        body: {
          memberId: memberAuth.id,
          status: "pending",
        },
      },
    );
  typia.assert(combinedVerifications);
  // Verify all results match both filters
  for (const verification of combinedVerifications.data) {
    TestValidator.equals(
      "combined filter memberId matches",
      verification.member.id,
      memberAuth.id,
    );
  }
}
