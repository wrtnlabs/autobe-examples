import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneKarma";
import type { IRedditCloneKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarma";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_karma_trends_analytics(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditClone.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
        displayName: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCloneMember.IJoin,
    },
  );
  typia.assert(member);
  // Create new connection with authentication token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: member.token.access,
    },
  };
  // 2. Test karma trend analytics with different configurations
  const today = new Date();
  // Test with different time ranges and sort options
  const timeRanges: ("today" | "week" | "month" | "year" | "allTime")[] = [
    "today",
    "week",
    "month",
    "year",
    "allTime",
  ];
  const sortOptions: ("scoreChange" | "percentageChange")[] = [
    "scoreChange",
    "percentageChange",
  ];
  for (const timeRange of timeRanges) {
    for (const sort of sortOptions) {
      // Test with pagination parameters
      const result =
        await api.functional.redditClone.member.analytics.karma.trends.index(
          authenticatedConnection,
          {
            body: {
              endDate: today.toISOString().split("T")[0],
              sort: sort,
              timeRange: timeRange,
              userId: member.id,
              page: 1,
              limit: 10,
            } satisfies IRedditCloneKarma.IRequest,
          },
        );
      typia.assert(result);
      // Validate pagination structure
      TestValidator.equals("pagination exists", result.pagination.current, 1);
      TestValidator.predicate(
        "pagination limit valid",
        result.pagination.limit > 0,
      );
      TestValidator.predicate(
        "pagination records valid",
        result.pagination.records >= 0,
      );
      TestValidator.predicate(
        "pagination pages valid",
        result.pagination.pages >= 0,
      );
      // Validate data structure
      if (result.data.length > 0) {
        const firstItem = result.data[0];
        typia.assert(firstItem);
        // Validate karma trend properties
        TestValidator.equals("date format", firstItem.date !== null, true);
        TestValidator.predicate(
          "scoreChange is number",
          typeof firstItem.scoreChange === "number",
        );
        TestValidator.predicate(
          "percentageChange is number",
          typeof firstItem.percentageChange === "number",
        );
        TestValidator.predicate(
          "postCount is number",
          typeof firstItem.postCount === "number",
        );
        TestValidator.predicate(
          "commentCount is number",
          typeof firstItem.commentCount === "number",
        );
        TestValidator.predicate(
          "totalScore is number",
          typeof firstItem.totalScore === "number",
        );
      }
    }
  }
  // 3. Test empty results with non-existent user
  const emptyResult =
    await api.functional.redditClone.member.analytics.karma.trends.index(
      authenticatedConnection,
      {
        body: {
          endDate: today.toISOString().split("T")[0],
          sort: "scoreChange",
          timeRange: "week",
          userId: "00000000-0000-0000-0000-000000000000", // Non-existent UUID
          page: 1,
          limit: 10,
        } satisfies IRedditCloneKarma.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty results for non-existent user",
    emptyResult.data.length,
    0,
  );
  // 4. Test boundary date values
  const boundaryDateResult =
    await api.functional.redditClone.member.analytics.karma.trends.index(
      authenticatedConnection,
      {
        body: {
          endDate: "2020-01-01", // Old date
          sort: "percentageChange",
          timeRange: "year",
          userId: member.id,
          page: 1,
          limit: 5,
        } satisfies IRedditCloneKarma.IRequest,
      },
    );
  typia.assert(boundaryDateResult);
  // 5. Test different pagination configurations
  for (let pageNum = 1; pageNum <= 2; pageNum++) {
    const paginatedResult =
      await api.functional.redditClone.member.analytics.karma.trends.index(
        authenticatedConnection,
        {
          body: {
            endDate: today.toISOString().split("T")[0],
            sort: "scoreChange",
            timeRange: "month",
            userId: member.id,
            page: pageNum,
            limit: 3,
          } satisfies IRedditCloneKarma.IRequest,
        },
      );
    typia.assert(paginatedResult);
    TestValidator.equals(
      "correct page number",
      paginatedResult.pagination.current,
      pageNum,
    );
    TestValidator.equals(
      "correct page limit",
      paginatedResult.pagination.limit,
      3,
    );
  }
}
