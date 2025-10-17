import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";

export async function test_api_moderator_search_reports_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create a member account to create reports
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(),
        password: "validPassword123",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);

  // Step 2: Create a community to host the reports
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name().toLowerCase().replace(/\s+/g, "-"),
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create at least 25 posts to populate reports
  const posts: ICommunityPlatformPost[] = await ArrayUtil.asyncRepeat(
    25,
    async (index) => {
      const post: ICommunityPlatformPost =
        await api.functional.communityPlatform.member.posts.create(connection, {
          body: {
            title: `Post #${index + 1} for reporting`,
            content: RandomGenerator.content({
              paragraphs: 2,
              sentenceMin: 5,
              sentenceMax: 10,
              wordMin: 3,
              wordMax: 8,
            }),
            post_type: "text",
          } satisfies ICommunityPlatformPost.ICreate,
        });
      typia.assert(post);
      return post;
    },
  );

  // Step 4: Create a moderator account for authentication
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(),
        password: "validPassword123",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 5: Submit 25+ reports with different reasons
  const reports: ICommunityPlatformReport[] = await ArrayUtil.asyncRepeat(
    25,
    async (index) => {
      const postToReport = posts[index % posts.length];
      const report: ICommunityPlatformReport =
        await api.functional.communityPlatform.member.reports.create(
          connection,
          {
            body: {
              reportedContentId: postToReport.id,
              reportReason: ["spam", "harassment", "inappropriate", "other"][
                index % 4
              ] as ICommunityPlatformReport.ICreate["reportReason"],
              reportNotes:
                index % 2 === 0
                  ? "This content violates community guidelines"
                  : undefined,
            } satisfies ICommunityPlatformReport.ICreate,
          },
        );
      typia.assert(report);
      return report;
    },
  );

  // Step 6: Test pagination with different limit values (10, 25, 50, 100)
  const limits = [10, 25, 50, 100];
  const request: ICommunityPlatformReport.IRequest = {
    limit: 10,
    page: 1,
  };

  for (const limit of limits) {
    request.limit = limit;
    request.page = 1;

    const response: IPageICommunityPlatformReport =
      await api.functional.communityPlatform.moderator.reports.search(
        connection,
        {
          body: request,
        },
      );
    typia.assert(response);

    TestValidator.equals(
      `Pagination limit ${limit}: returned reports count matches limit`,
      response.data.length,
      limit,
    );

    TestValidator.equals(
      `Pagination limit ${limit}: limit matches request`,
      response.pagination.limit,
      limit,
    );

    TestValidator.predicate(
      `Pagination limit ${limit}: current page is 1`,
      response.pagination.current === 1,
    );

    TestValidator.predicate(
      `Pagination limit ${limit}: total records >= 25`,
      response.pagination.records >= 25,
    );
  }

  // Step 7: Test with page 2 and limit 10 to ensure offset works
  request.limit = 10;
  request.page = 2;

  const secondPageResponse: IPageICommunityPlatformReport =
    await api.functional.communityPlatform.moderator.reports.search(
      connection,
      {
        body: request,
      },
    );
  typia.assert(secondPageResponse);

  TestValidator.equals(
    "Pagination page 2: returned reports count is 10",
    secondPageResponse.data.length,
    10,
  );

  TestValidator.equals(
    "Pagination page 2: limit matches request",
    secondPageResponse.pagination.limit,
    10,
  );

  TestValidator.equals(
    "Pagination page 2: current page is 2",
    secondPageResponse.pagination.current,
    2,
  );

  TestValidator.predicate(
    "Pagination page 2: total records >= 25",
    secondPageResponse.pagination.records >= 25,
  );

  // Step 8: Test that pagination respects max limit of 100
  request.limit = 150; // exceeds max limit of 100
  request.page = 1;

  const exceedsMaxLimitResponse: IPageICommunityPlatformReport =
    await api.functional.communityPlatform.moderator.reports.search(
      connection,
      {
        body: request,
      },
    );
  typia.assert(exceedsMaxLimitResponse);

  TestValidator.equals(
    "Exceeds max limit: limit capped at 100",
    exceedsMaxLimitResponse.pagination.limit,
    100,
  );

  TestValidator.equals(
    "Exceeds max limit: returned reports count capped at 100",
    exceedsMaxLimitResponse.data.length,
    100,
  );

  // Step 9: Verify the total reports count in pagination reflects all created reports
  TestValidator.predicate(
    "Total reports in pagination reflects all created reports",
    exceedsMaxLimitResponse.pagination.records >= 25,
  );
}
