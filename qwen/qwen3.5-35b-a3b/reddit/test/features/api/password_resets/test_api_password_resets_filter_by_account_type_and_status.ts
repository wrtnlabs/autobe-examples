import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityAdminPasswordReset";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminPasswordReset";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_password_resets_filter_by_account_type_and_status(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Authenticate as member using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // Test 1: Filter by accountType=member
  const memberResults =
    await api.functional.redditCommunity.member.password_resets.index(
      memberConnection,
      {
        body: {
          accountType: "member",
          status: "active",
        } satisfies IRedditCommunityAdminPasswordReset.IRequest,
      },
    );
  typia.assert(memberResults);
  // Test 2: Filter by accountType=admin
  const adminResults =
    await api.functional.redditCommunity.member.password_resets.index(
      memberConnection,
      {
        body: {
          accountType: "admin",
          status: "active",
        } satisfies IRedditCommunityAdminPasswordReset.IRequest,
      },
    );
  typia.assert(adminResults);
  // Test 3: Filter by status=used
  const usedResults =
    await api.functional.redditCommunity.member.password_resets.index(
      memberConnection,
      {
        body: {
          status: "used",
        } satisfies IRedditCommunityAdminPasswordReset.IRequest,
      },
    );
  typia.assert(usedResults);
  for (const record of usedResults.data) {
    TestValidator.predicate("used record has usedAt", record.usedAt !== null);
  }
  // Test 4: Filter by status=expired
  const expiredResults =
    await api.functional.redditCommunity.member.password_resets.index(
      memberConnection,
      {
        body: {
          status: "expired",
        } satisfies IRedditCommunityAdminPasswordReset.IRequest,
      },
    );
  typia.assert(expiredResults);
  for (const record of expiredResults.data) {
    TestValidator.predicate(
      "expired record has no usedAt",
      record.usedAt === null,
    );
    TestValidator.predicate(
      "expired record expiresAt is in past",
      new Date(record.expiresAt) <= new Date(),
    );
  }
  // Test 5: Combined filters (accountType=member AND status=expired)
  const combinedResults =
    await api.functional.redditCommunity.member.password_resets.index(
      memberConnection,
      {
        body: {
          accountType: "member",
          status: "expired",
        } satisfies IRedditCommunityAdminPasswordReset.IRequest,
      },
    );
  typia.assert(combinedResults);
  // Test 6: Date range filters
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRangeResults =
    await api.functional.redditCommunity.member.password_resets.index(
      memberConnection,
      {
        body: {
          createdAtStart: oneWeekAgo.toISOString(),
          createdAtEnd: now.toISOString(),
        } satisfies IRedditCommunityAdminPasswordReset.IRequest,
      },
    );
  typia.assert(dateRangeResults);
  // Validate date range filter
  for (const record of dateRangeResults.data) {
    TestValidator.predicate(
      "record createdAt within range",
      new Date(record.createdAt) >= oneWeekAgo &&
        new Date(record.createdAt) <= now,
    );
  }
  // Test 7: Empty result set scenario
  const futureDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const emptyResults =
    await api.functional.redditCommunity.member.password_resets.index(
      memberConnection,
      {
        body: {
          createdAtStart: futureDate.toISOString(),
          createdAtEnd: futureDate.toISOString(),
        } satisfies IRedditCommunityAdminPasswordReset.IRequest,
      },
    );
  typia.assert(emptyResults);
  TestValidator.equals("empty result count", emptyResults.data.length, 0);
  TestValidator.equals(
    "empty pagination records",
    emptyResults.pagination.records,
    0,
  );
}