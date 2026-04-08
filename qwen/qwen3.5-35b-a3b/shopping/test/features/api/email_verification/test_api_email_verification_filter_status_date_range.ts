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

export async function test_api_email_verification_filter_status_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member registration - creates pending verification
  const memberConnection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(memberConnection, {
    body: {
      email: `member1_${typia.random<string & tags.Format<"email">>()}`,
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(member1);
  // 2. Second member registration - another pending verification
  const memberConnection2: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(memberConnection2, {
    body: {
      email: `member2_${typia.random<string & tags.Format<"email">>()}`,
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(member2);
  // 3. Create a verification record that will be used
  // Simulate verification by using the existing verification for member1
  // This requires a verification endpoint which we don't have, so we'll use the existing pending records
  const today = new Date();
  const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
  // 4. Test filtering by status = pending
  const pendingFilter = {
    status: "pending" as const,
    limit: 100,
  } satisfies IEcommerceMallMemberEmailVerification.IRequest;
  const pendingResponse =
    await api.functional.ecommerceMall.member.email_verifications.index(
      memberConnection,
      { body: pendingFilter },
    );
  typia.assert(pendingResponse);
  // Verify all returned records have pending status
  for (const record of pendingResponse.data) {
    TestValidator.equals("status is pending", record.status, "pending");
  }
  // 5. Test filtering by date range
  const dateRangeFilter = {
    created_at: {
      gte: threeDaysAgo.toISOString(),
      lte: today.toISOString(),
    },
    limit: 100,
  } satisfies IEcommerceMallMemberEmailVerification.IRequest;
  const dateRangeResponse =
    await api.functional.ecommerceMall.member.email_verifications.index(
      memberConnection,
      { body: dateRangeFilter },
    );
  typia.assert(dateRangeResponse);
  // Verify all returned records fall within date range
  for (const record of dateRangeResponse.data) {
    TestValidator.predicate(
      `created_at ${record.created_at} is within range [${threeDaysAgo.toISOString()}, ${today.toISOString()}]`,
      () => {
        const createdAt = new Date(record.created_at);
        return createdAt >= threeDaysAgo && createdAt <= today;
      },
    );
  }
  // 6. Test combined filtering (status + date range + email pattern)
  const combinedFilter = {
    status: "pending" as const,
    created_at: {
      gte: threeDaysAgo.toISOString(),
      lte: today.toISOString(),
    },
    email: "member1", // partial match
    limit: 100,
  } satisfies IEcommerceMallMemberEmailVerification.IRequest;
  const combinedResponse =
    await api.functional.ecommerceMall.member.email_verifications.index(
      memberConnection,
      { body: combinedFilter },
    );
  typia.assert(combinedResponse);
  // Verify all returned records match ALL filters
  for (const record of combinedResponse.data) {
    TestValidator.equals("status is pending", record.status, "pending");
    TestValidator.equals(
      "email contains pattern",
      record.email.includes("member1"),
      true,
    );
    TestValidator.predicate(
      `created_at ${record.created_at} is within range`,
      () => {
        const createdAt = new Date(record.created_at);
        return createdAt >= threeDaysAgo && createdAt <= today;
      },
    );
  }
  // 7. Test empty results
  const noMatchFilter = {
    status: "pending" as const,
    email: "nonexistent_user_xyz",
    limit: 100,
  } satisfies IEcommerceMallMemberEmailVerification.IRequest;
  const noMatchResponse =
    await api.functional.ecommerceMall.member.email_verifications.index(
      memberConnection,
      { body: noMatchFilter },
    );
  typia.assert(noMatchResponse);
  TestValidator.equals("no records match", noMatchResponse.data.length, 0);
  TestValidator.equals(
    "total count is 0",
    noMatchResponse.pagination.records,
    0,
  );
  // 8. Test pagination accuracy
  TestValidator.equals(
    "pagination records matches data length",
    pendingResponse.pagination.records,
    pendingResponse.data.length,
  );
}
