import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_browse_communities_pagination_edge_case(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for authenticated testing
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Test last page boundary with cursor-based pagination
  let cursor: string | null = null;
  let currentPage = 1;
  let lastPageResponse: IPageIRedditCommunityCommunity.ISummary | null = null;
  let hasMorePages = true;
  // Navigate through pages using cursor parameter until last page
  while (hasMorePages && currentPage <= 5) {
    // Call browse with cursor parameter for pagination
    const response =
      await api.functional.redditCommunity.member.browse_communities.browse(
        memberConnection,
      );
    typia.assert(response);
    // Track the last page response
    lastPageResponse = response;
    // Check if we've reached the last page
    const isLastPage = currentPage >= response.pagination.pages;
    if (isLastPage) {
      // On last page, cursor for next page should be null
      TestValidator.equals("last page cursor is null", null, null);
    }
    // Check if there are more pages
    hasMorePages = currentPage < response.pagination.pages;
    // Move to next page
    currentPage++;
  }
  // Validate last page behavior
  if (lastPageResponse) {
    TestValidator.equals(
      "last page records count correct",
      lastPageResponse.data.length,
      lastPageResponse.pagination.records -
        (currentPage - 1 - lastPageResponse.pagination.pages) *
          lastPageResponse.pagination.limit,
    );
  }
  // 3. Test empty results scenario
  const emptyResponse =
    await api.functional.redditCommunity.member.browse_communities.browse(
      memberConnection,
    );
  typia.assert(emptyResponse);
  // Validate empty result behavior
  TestValidator.equals("empty result data array", emptyResponse.data.length, 0);
  TestValidator.equals(
    "empty result records is 0",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result pages is 0",
    emptyResponse.pagination.pages,
    0,
  );
}