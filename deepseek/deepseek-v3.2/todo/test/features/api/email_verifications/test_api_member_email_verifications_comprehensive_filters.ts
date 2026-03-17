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

/**
 * Test comprehensive search scenarios combining multiple filters:
 * 1) Search for registration tokens that are verified and created within a specific date range
 * 2) Search for email_change tokens that are not consumed and expire after a certain date
 * 3) Search with purpose as array ['registration', 'email_change'] to get multiple purpose types in one query
 * 4) Test with combination of verified=true and consumed=false to find active verification tokens.
 * Validate that the response correctly applies all filter combinations using AND logic.
 * Ensure proper join with todo_app_members table to include member information in each token summary.
 * Verify that calculated fields like 'status' are accurately computed based on the actual timestamps.
 * Test that the system handles date format validation properly for expires_before, expires_after, created_before, and created_after filters.
 * Validate that limit parameter respects maximum value of 100 and minimum value of 1 as defined in the schema.
 */
export async function test_api_member_email_verifications_comprehensive_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection using authorize_member_join utility
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  typia.assert(authorizedMember);
  // Test 1: Search for registration tokens that are verified and created within date range
  const now = new Date();
  const twoDaysAgo = new Date(
    now.getTime() - 2 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const oneDayAgo = new Date(
    now.getTime() - 1 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const test1Body = {
    purpose: "registration",
    verified: true,
    created_after: twoDaysAgo,
    created_before: oneDayAgo,
    limit: 10,
  } satisfies ITodoAppMemberEmailVerification.IRequest;
  const test1Response =
    await api.functional.todoApp.member.email_verifications.index(
      memberConnection,
      { body: test1Body },
    );
  typia.assert(test1Response);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination fields exist",
    test1Response.pagination !== undefined && test1Response.data !== undefined,
  );
  // Validate all results match the filter criteria
  for (const token of test1Response.data) {
    TestValidator.equals(
      "purpose matches registration",
      token.purpose,
      "registration",
    );
    TestValidator.predicate(
      "token is verified",
      token.verified_at !== null && token.verified_at !== undefined,
    );
    const createdAt = new Date(token.created_at).getTime();
    const afterTime = new Date(twoDaysAgo).getTime();
    const beforeTime = new Date(oneDayAgo).getTime();
    TestValidator.predicate(
      "created within date range",
      createdAt >= afterTime && createdAt <= beforeTime,
    );
    // Validate member information is included
    TestValidator.predicate(
      "member information exists",
      token.member !== undefined &&
        token.member.id !== undefined &&
        token.member.email !== undefined,
    );
    // Validate status field based on timestamps
    const expiresAt = new Date(token.expires_at).getTime();
    const isExpired = expiresAt < now.getTime();
    const isVerified =
      token.verified_at !== null && token.verified_at !== undefined;
    if (isVerified) {
      TestValidator.equals(
        "status should be verified for verified tokens",
        token.status,
        "verified",
      );
    } else if (isExpired) {
      TestValidator.equals(
        "status should be expired for expired tokens",
        token.status,
        "expired",
      );
    } else {
      TestValidator.equals(
        "status should be active for non-expired, non-verified tokens",
        token.status,
        "active",
      );
    }
  }
  // Test 2: email_change tokens not consumed and expire after a certain date
  const futureDate = new Date(
    now.getTime() + 5 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const test2Body = {
    purpose: "email_change",
    consumed: false,
    expires_after: futureDate,
    limit: 5,
  } satisfies ITodoAppMemberEmailVerification.IRequest;
  const test2Response =
    await api.functional.todoApp.member.email_verifications.index(
      memberConnection,
      { body: test2Body },
    );
  typia.assert(test2Response);
  for (const token of test2Response.data) {
    TestValidator.equals(
      "purpose matches email_change",
      token.purpose,
      "email_change",
    );
    TestValidator.predicate(
      "token is not consumed",
      token.consumed_at === null || token.consumed_at === undefined,
    );
    const expiresAt = new Date(token.expires_at).getTime();
    const futureTime = new Date(futureDate).getTime();
    TestValidator.predicate(
      "token expires after specified date",
      expiresAt >= futureTime,
    );
  }
  // Test 3: Multiple purpose types in one query
  const test3Body = {
    purpose: ["registration", "email_change"],
    limit: 15,
  } satisfies ITodoAppMemberEmailVerification.IRequest;
  const test3Response =
    await api.functional.todoApp.member.email_verifications.index(
      memberConnection,
      { body: test3Body },
    );
  typia.assert(test3Response);
  TestValidator.predicate(
    "results contain only specified purposes",
    test3Response.data.every(
      (token) =>
        token.purpose === "registration" || token.purpose === "email_change",
    ),
  );
  // Test 4: Verified=true and consumed=false combination
  const test4Body = {
    verified: true,
    consumed: false,
    limit: 8,
  } satisfies ITodoAppMemberEmailVerification.IRequest;
  const test4Response =
    await api.functional.todoApp.member.email_verifications.index(
      memberConnection,
      { body: test4Body },
    );
  typia.assert(test4Response);
  for (const token of test4Response.data) {
    TestValidator.predicate(
      "token is verified",
      token.verified_at !== null && token.verified_at !== undefined,
    );
    TestValidator.predicate(
      "token is not consumed",
      token.consumed_at === null || token.consumed_at === undefined,
    );
  }
  // Test limit parameter boundaries
  const testLimit1Body = {
    limit: 1,
  } satisfies ITodoAppMemberEmailVerification.IRequest;
  const limit1Response =
    await api.functional.todoApp.member.email_verifications.index(
      memberConnection,
      { body: testLimit1Body },
    );
  typia.assert(limit1Response);
  TestValidator.equals(
    "limit 1 returns correct pagination limit",
    limit1Response.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "data length respects limit 1",
    limit1Response.data.length <= 1,
  );
  const testLimit100Body = {
    limit: 100,
  } satisfies ITodoAppMemberEmailVerification.IRequest;
  const limit100Response =
    await api.functional.todoApp.member.email_verifications.index(
      memberConnection,
      { body: testLimit100Body },
    );
  typia.assert(limit100Response);
  TestValidator.equals(
    "limit 100 returns correct pagination limit",
    limit100Response.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "data length respects limit 100",
    limit100Response.data.length <= 100,
  );
  // Test combined filters with AND logic
  const combinedTestBody = {
    purpose: "registration",
    verified: true,
    consumed: false,
    created_after: twoDaysAgo,
    expires_before: futureDate,
    limit: 3,
  } satisfies ITodoAppMemberEmailVerification.IRequest;
  const combinedResponse =
    await api.functional.todoApp.member.email_verifications.index(
      memberConnection,
      { body: combinedTestBody },
    );
  typia.assert(combinedResponse);
  for (const token of combinedResponse.data) {
    TestValidator.equals("purpose matches", token.purpose, "registration");
    TestValidator.predicate(
      "is verified",
      token.verified_at !== null && token.verified_at !== undefined,
    );
    TestValidator.predicate(
      "not consumed",
      token.consumed_at === null || token.consumed_at === undefined,
    );
    const createdAt = new Date(token.created_at).getTime();
    const afterTime = new Date(twoDaysAgo).getTime();
    TestValidator.predicate(
      "created after specified date",
      createdAt >= afterTime,
    );
    const expiresAt = new Date(token.expires_at).getTime();
    const beforeTime = new Date(futureDate).getTime();
    TestValidator.predicate(
      "expires before specified date",
      expiresAt <= beforeTime,
    );
  }
}
