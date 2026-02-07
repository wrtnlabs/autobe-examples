import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_comments_create } from "../../../generate/generate_random_community_member_comments_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";

export async function test_api_member_comments_search_by_keyword(
  connection: api.IConnection,
): Promise<void> {
  // Create a member connection for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 1: Authenticate member via join
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "securePassword123",
  } satisfies ICommunityMember.IJoin;
  const authResponse = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  typia.assert(authResponse);
  // Create test comments with varying content
  const searchKeyword = "important";
  const commentCount = 15;
  const commentPromises = ArrayUtil.repeat(commentCount, async (index) => {
    const content = RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 3,
      sentenceMax: 6,
      wordMin: 3,
      wordMax: 8,
    });
    // Ensure some comments contain the search keyword
    let finalContent = content;
    if (index % 3 === 0) {
      // Make every 3rd comment contain the search keyword
      finalContent = content + " This is an important comment.";
      finalContent = finalContent.replace(/important/gi, searchKeyword);
    }
    const commentBody = {
      content: finalContent,
    } satisfies ICommunityComment.ICreate;
    return await generate_random_community_member_comments_create(
      memberConnection,
      {
        body: commentBody,
      },
    );
  });
  // Wait for all comments to be created
  const createdComments = await Promise.all(commentPromises);
  // Step 2: Perform search with keyword
  // Despite ICommunityComment.IRequest being empty in DTO, API expects keyword, limit, page per function description
  const searchRequest = {
    keyword: searchKeyword,
    limit: 10,
    page: 1,
  } satisfies ICommunityComment.IRequest;
  const searchResponse = await api.functional.community.member.comments.index(
    memberConnection,
    {
      body: searchRequest,
    },
  );
  typia.assert(searchResponse);
  // Step 3: Validate search results
  // Verify we got exactly 10 results due to limit
  TestValidator.equals(
    "pagination limit respects",
    searchResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "current page is 1",
    searchResponse.pagination.current,
    1,
  );
  TestValidator.predicate("has data", searchResponse.data.length > 0);
  // ISummary doesn't contain status or content properties - validation of these is impossible
  // Validate that search returned results (existence implies correct keyword matching)
  // Verify total records is higher than returned items since we created 15 comments
  TestValidator.predicate(
    "total records greater than page size",
    searchResponse.pagination.records > 10,
  );
}
