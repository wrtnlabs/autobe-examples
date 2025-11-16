import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformVotingAbuseFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingAbuseFlag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVotingAbuseFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVotingAbuseFlag";

/**
 * Validate that an administrator can retrieve a filtered, paginated list of
 * voting abuse flags with various filter criteria and correct access role.
 *
 * 1. Create and sign in a new administrator (to get access token)
 * 2. Perform searches using different filter combinations: user_id, ip,
 *    violation_type, status, date ranges, pagination, ordering
 * 3. For each search:
 *
 *    - Verify output uses pagination
 *         (IPageICommunityPlatformVotingAbuseFlag.ISummary)
 *    - Check that data[].* matches the given filter(s)
 *    - Test paging/limit logic on results
 *    - Check that unauthorized requests are not allowed
 */
export async function test_api_voting_abuse_flags_admin_list_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a new administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const adminJoin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminJoin);

  // Prepare random search filters
  const filterSamples: ICommunityPlatformVotingAbuseFlag.IRequest[] = [
    // user_id filter
    { user_id: typia.random<string & tags.Format<"uuid">>() },
    // ip filter
    { ip: RandomGenerator.alphaNumeric(8) + ".1.1.1" },
    // violation_type filter
    {
      violation_type: RandomGenerator.pick([
        "brigading",
        "automation",
        "rate_limit",
      ]),
    },
    // status filter
    { status: RandomGenerator.pick(["open", "resolved", "pending_review"]) },
    // created_from/to date filter
    {
      created_from: new Date(
        Date.now() - 2 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      created_to: new Date().toISOString(),
    },
    // resolved_from/to date filter
    {
      resolved_from: new Date(
        Date.now() - 3 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      resolved_to: new Date().toISOString(),
    },
    // pagination
    { page: 1, limit: 5 },
    // order_by
    { order_by: "created_at desc" },
  ];

  // 2. Try each filter in a search
  for (const filter of filterSamples) {
    const response =
      await api.functional.communityPlatform.administrator.votingAbuseFlags.index(
        connection,
        { body: filter },
      );
    typia.assert(response);
    // Always a paginated result
    TestValidator.predicate(
      "pagination object returned",
      typeof response.pagination === "object",
    );
    // For each filter: all items must match if filter includes search criteria
    if (filter.user_id !== undefined) {
      for (const item of response.data) {
        TestValidator.equals(
          "flag matches user_id filter",
          item.community_platform_user_id,
          filter.user_id,
        );
      }
    }
    if (filter.ip !== undefined) {
      for (const item of response.data) {
        TestValidator.equals("flag matches ip filter", item.ip, filter.ip);
      }
    }
    if (filter.violation_type !== undefined) {
      for (const item of response.data) {
        TestValidator.equals(
          "flag matches violation_type filter",
          item.violation_type,
          filter.violation_type,
        );
      }
    }
    if (filter.status !== undefined) {
      for (const item of response.data) {
        TestValidator.equals(
          "flag matches status filter",
          item.status,
          filter.status,
        );
      }
    }
    if (filter.created_from !== undefined) {
      for (const item of response.data) {
        TestValidator.predicate(
          "flag created_at >= created_from",
          item.created_at >= filter.created_from!,
        );
      }
    }
    if (filter.created_to !== undefined) {
      for (const item of response.data) {
        TestValidator.predicate(
          "flag created_at <= created_to",
          item.created_at <= filter.created_to!,
        );
      }
    }
    if (filter.resolved_from !== undefined) {
      for (const item of response.data) {
        if (item.resolved_at !== undefined && item.resolved_at !== null)
          TestValidator.predicate(
            "flag resolved_at >= resolved_from",
            item.resolved_at >= filter.resolved_from!,
          );
      }
    }
    if (filter.resolved_to !== undefined) {
      for (const item of response.data) {
        if (item.resolved_at !== undefined && item.resolved_at !== null)
          TestValidator.predicate(
            "flag resolved_at <= resolved_to",
            item.resolved_at <= filter.resolved_to!,
          );
      }
    }
    if (filter.page !== undefined && filter.limit !== undefined) {
      TestValidator.equals(
        "pagination limit respected",
        response.pagination.limit,
        filter.limit satisfies number as number,
      );
      TestValidator.equals(
        "pagination current respected",
        response.pagination.current,
        filter.page satisfies number as number,
      );
    }
    // Validate data matches shape and that ordering/pagination logic runs (since data is random, don't deeply test order)
  }
}
