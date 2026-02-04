import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_comment_search_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformMember.IJoin;
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: memberCredentials,
    });
  // Step 2: Execute search with sort: 'best', limit: 20 (only allowed parameters)
  const searchParams = {
    sort: "best" as const,
    limit: 20,
  } satisfies ICommunityPlatformComment.IRequest;
  const searchResults: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.search.comments.index(
      memberConnection,
      {
        body: searchParams,
      },
    );
  typia.assert(searchResults);
  // Step 3: Validate search results with allowed parameters
  // Check that pagination is correct
  TestValidator.equals(
    "pagination limit equals 20",
    searchResults.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination current >= 1",
    searchResults.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination records > 0",
    searchResults.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages > 0",
    searchResults.pagination.pages > 0,
  );
  // Verify that results are properly sorted by 'best' (highest voteScore)
  // We cannot verify content since we can't search by text
  // But we can verify that voteScore is descending
  TestValidator.predicate(
    "search results have at least 1 comment",
    searchResults.data.length >= 1,
  );
  // Check that votes are sorted descending (best sorting)
  for (let i = 0; i < searchResults.data.length - 1; i++) {
    TestValidator.predicate(
      "comments sorted by descending vote score",
      searchResults.data[i].voteScore >= searchResults.data[i + 1].voteScore,
    );
  }
  // Verify that all returned comments have valid structure
  for (const comment of searchResults.data) {
    TestValidator.predicate(
      "comment has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        comment.id,
      ),
    );
    TestValidator.predicate(
      "comment has non-negative vote score",
      comment.voteScore >= 0,
    );
    TestValidator.predicate(
      "comment content has valid length",
      comment.content.length > 0 && comment.content.length <= 300,
    );
    TestValidator.predicate(
      "comment has valid creation date",
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(comment.createdAt),
    );
    TestValidator.predicate(
      "comment has non-negative reply count",
      comment.replyCount >= 0,
    );
  }
  // Step 4: Confirm unauthorized guest access is blocked
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("guest access should be rejected", async () => {
    await api.functional.communityPlatform.search.comments.index(
      guestConnection,
      {
        body: searchParams,
      },
    );
  });
}
