import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarma";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarma";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_karma_list_complex_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Test minimum score only (no maximum)
  const minScore = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<-100> & tags.Maximum<100>
  >();
  const minScoreResponse =
    await api.functional.communityPlatform.admin.karmas.index(adminConnection, {
      body: {
        min_score: minScore satisfies number as number,
        limit: 10 satisfies number as number,
      } satisfies ICommunityPlatformKarma.IRequest,
    });
  typia.assert(minScoreResponse);
  // Validate all scores meet minimum requirement
  for (const karma of minScoreResponse.data) {
    TestValidator.predicate(
      `score ${karma.score} >= min_score ${minScore}`,
      karma.score >= minScore,
    );
  }
  // 3. Test maximum score only (no minimum)
  const maxScore = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<-100> & tags.Maximum<100>
  >();
  const maxScoreResponse =
    await api.functional.communityPlatform.admin.karmas.index(adminConnection, {
      body: {
        max_score: maxScore satisfies number as number,
        limit: 10 satisfies number as number,
      } satisfies ICommunityPlatformKarma.IRequest,
    });
  typia.assert(maxScoreResponse);
  // Validate all scores meet maximum requirement
  for (const karma of maxScoreResponse.data) {
    TestValidator.predicate(
      `score ${karma.score} <= max_score ${maxScore}`,
      karma.score <= maxScore,
    );
  }
  // 4. Test combined date range filtering
  const now = new Date().toISOString();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const dateRangeResponse =
    await api.functional.communityPlatform.admin.karmas.index(adminConnection, {
      body: {
        created_at_start: weekAgo satisfies string as string,
        created_at_end: now satisfies string as string &
          tags.Format<"date-time"> as string,
        updated_at_start: weekAgo satisfies string as string,
        updated_at_end: now satisfies string as string &
          tags.Format<"date-time"> as string,
        limit: 10 satisfies number as number,
      } satisfies ICommunityPlatformKarma.IRequest,
    });
  typia.assert(dateRangeResponse);
  // Validate timestamps are within range
  for (const karma of dateRangeResponse.data) {
    const createdAt = new Date(karma.created_at).getTime();
    const weekAgoTime = new Date(weekAgo).getTime();
    const nowTime = new Date(now).getTime();
    TestValidator.predicate(
      `created_at ${karma.created_at} within range`,
      createdAt >= weekAgoTime && createdAt <= nowTime,
    );
    const updatedAt = new Date(karma.updated_at).getTime();
    TestValidator.predicate(
      `updated_at ${karma.updated_at} within range`,
      updatedAt >= weekAgoTime && updatedAt <= nowTime,
    );
  }
  // 5. Test text search across member username
  // First get some existing karma records to extract usernames
  const initialResponse =
    await api.functional.communityPlatform.admin.karmas.index(adminConnection, {
      body: {
        limit: 5 satisfies number as number,
      } satisfies ICommunityPlatformKarma.IRequest,
    });
  typia.assert(initialResponse);
  if (initialResponse.data.length > 0) {
    const sampleKarma = initialResponse.data[0];
    const searchTerm = sampleKarma.member.username.substring(0, 3);
    const searchResponse =
      await api.functional.communityPlatform.admin.karmas.index(
        adminConnection,
        {
          body: {
            search: searchTerm satisfies string as string,
            limit: 10 satisfies number as number,
          } satisfies ICommunityPlatformKarma.IRequest,
        },
      );
    typia.assert(searchResponse);
    // Validate search results contain the search term in username or nickname
    for (const karma of searchResponse.data) {
      TestValidator.predicate(
        `search term '${searchTerm}' found in username or nickname`,
        karma.member.username
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
          (karma.member.nickname !== null &&
            karma.member.nickname !== undefined &&
            karma.member.nickname
              .toLowerCase()
              .includes(searchTerm.toLowerCase())),
      );
    }
  }
  // 6. Test pagination edge cases
  // Test empty result set with impossible filter
  const impossibleFilterResponse =
    await api.functional.communityPlatform.admin.karmas.index(adminConnection, {
      body: {
        min_score: 1000000 satisfies number as number,
        max_score: 1000001 satisfies number as number,
        limit: 10 satisfies number as number,
      } satisfies ICommunityPlatformKarma.IRequest,
    });
  typia.assert(impossibleFilterResponse);
  TestValidator.equals(
    "empty result set for impossible filter",
    impossibleFilterResponse.data.length,
    0,
  );
  // Test pagination metadata
  const paginationResponse =
    await api.functional.communityPlatform.admin.karmas.index(adminConnection, {
      body: {
        page: 1 satisfies number as number,
        limit: 5 satisfies number as number,
      } satisfies ICommunityPlatformKarma.IRequest,
    });
  typia.assert(paginationResponse);
  TestValidator.predicate(
    "pagination current page is 1",
    paginationResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    paginationResponse.pagination.limit === 5,
  );
  // Test multi-page navigation if there are enough records
  if (paginationResponse.pagination.pages > 1) {
    const secondPageResponse =
      await api.functional.communityPlatform.admin.karmas.index(
        adminConnection,
        {
          body: {
            page: 2 satisfies number as number,
            limit: 5 satisfies number as number,
          } satisfies ICommunityPlatformKarma.IRequest,
        },
      );
    typia.assert(secondPageResponse);
    TestValidator.equals(
      "second page current is 2",
      secondPageResponse.pagination.current,
      2,
    );
    // Verify pages are different
    if (
      paginationResponse.data.length > 0 &&
      secondPageResponse.data.length > 0
    ) {
      const firstPageIds = paginationResponse.data.map((k) => k.id);
      const secondPageIds = secondPageResponse.data.map((k) => k.id);
      // Pages should not overlap (assuming unique IDs)
      for (const id of firstPageIds) {
        TestValidator.predicate(
          `ID ${id} not in both pages`,
          !secondPageIds.includes(id),
        );
      }
    }
  }
  // 7. Verify karma scores are integers (including negative values)
  const allKarmaResponse =
    await api.functional.communityPlatform.admin.karmas.index(adminConnection, {
      body: {
        limit: 20 satisfies number as number,
      } satisfies ICommunityPlatformKarma.IRequest,
    });
  typia.assert(allKarmaResponse);
  for (const karma of allKarmaResponse.data) {
    TestValidator.predicate(
      `score ${karma.score} is integer`,
      Number.isInteger(karma.score),
    );
  }
  // 8. Test that each karma record has exactly one associated member
  for (const karma of allKarmaResponse.data) {
    typia.assert(karma.member);
    TestValidator.predicate(
      "member has required fields",
      typeof karma.member.id === "string" &&
        typeof karma.member.email === "string" &&
        typeof karma.member.username === "string",
    );
  }
  // 9. Validate timestamps reflect actual creation and last update times
  for (const karma of allKarmaResponse.data) {
    const createdAt = new Date(karma.created_at);
    const updatedAt = new Date(karma.updated_at);
    TestValidator.predicate(
      `created_at ${karma.created_at} is valid date`,
      !isNaN(createdAt.getTime()),
    );
    TestValidator.predicate(
      `updated_at ${karma.updated_at} is valid date`,
      !isNaN(updatedAt.getTime()),
    );
    // updated_at should not be before created_at
    TestValidator.predicate(
      `updated_at not before created_at`,
      updatedAt >= createdAt,
    );
  }
}
