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

export async function test_api_member_email_verifications_search(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member connection using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // Test 1: Search by purpose='registration'
  const searchByPurpose =
    await api.functional.todoApp.member.email_verifications.index(
      memberConnection,
      {
        body: {
          purpose: "registration",
          page: 1,
          limit: 10,
        } satisfies ITodoAppMemberEmailVerification.IRequest,
      },
    );
  typia.assert(searchByPurpose);
  TestValidator.equals(
    "page should be 1",
    searchByPurpose.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 10",
    searchByPurpose.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "total pages should be non-negative",
    searchByPurpose.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "total records should be non-negative",
    searchByPurpose.pagination.records >= 0,
  );
  // Validate token summary structure - typia.assert already validates all fields
  for (const token of searchByPurpose.data) {
    typia.assert(token);
    typia.assert(token.member);
    // Verify data isolation: token member should match authenticated member
    TestValidator.equals(
      "token member id matches authenticated member",
      token.member.id,
      member.id,
    );
  }
  // Test 2: Search with verified=true
  const searchVerified =
    await api.functional.todoApp.member.email_verifications.index(
      memberConnection,
      {
        body: {
          verified: true,
          page: 1,
          limit: 10,
        } satisfies ITodoAppMemberEmailVerification.IRequest,
      },
    );
  typia.assert(searchVerified);
  for (const token of searchVerified.data) {
    // If token is in results with verified=true, it should have verified_at and status 'verified'
    // But results may be empty if no verified tokens exist
    if (token.verified_at !== null && token.verified_at !== undefined) {
      TestValidator.predicate(
        "verified token should have status 'verified'",
        token.status === "verified",
      );
    }
  }
  // Test 3: Search with expires_before filter
  const expiresBefore = new Date();
  expiresBefore.setDate(expiresBefore.getDate() + 7); // 7 days from now
  const searchExpiresBefore =
    await api.functional.todoApp.member.email_verifications.index(
      memberConnection,
      {
        body: {
          expires_before: expiresBefore.toISOString(),
          page: 1,
          limit: 10,
        } satisfies ITodoAppMemberEmailVerification.IRequest,
      },
    );
  typia.assert(searchExpiresBefore);
  for (const token of searchExpiresBefore.data) {
    const expiresAt = new Date(token.expires_at);
    const beforeDate = new Date(expiresBefore.toISOString()); // Ensure both are Date objects
    TestValidator.predicate(
      "token should expire before or at the specified date",
      expiresAt <= beforeDate,
    );
  }
  // Test 4: Pagination with page=2, limit=5
  const searchPagination =
    await api.functional.todoApp.member.email_verifications.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies ITodoAppMemberEmailVerification.IRequest,
      },
    );
  typia.assert(searchPagination);
  TestValidator.equals(
    "page should be 2",
    searchPagination.pagination.current,
    2,
  );
  TestValidator.equals(
    "limit should be 5",
    searchPagination.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data length should be <= limit",
    searchPagination.data.length <= 5,
  );
}