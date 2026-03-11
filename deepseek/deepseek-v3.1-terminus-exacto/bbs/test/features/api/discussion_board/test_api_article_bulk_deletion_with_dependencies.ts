import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test bulk deletion of discussion board articles using available filtering criteria.
 * This test focuses on the bulk deletion endpoint functionality with the provided
 * member authentication and article deletion APIs. Since article creation and comment
 * APIs are not available, the test validates that the deletion operation completes
 * successfully with various filter combinations.
 */
export async function test_api_article_bulk_deletion_with_dependencies(
  connection: api.IConnection,
): Promise<void> {
  // Create member actor
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  // Test 1: Bulk deletion with author filter
  const deleteRequest1: IDiscussionBoardArticle.IDeleteRequest = {
    author_id: member.id,
    status: "published",
  } satisfies IDiscussionBoardArticle.IDeleteRequest;
  await api.functional.discussionBoard.member.articles.erase(memberConnection, {
    body: deleteRequest1,
  });
  // Test 2: Bulk deletion with date range filter
  const deleteRequest2: IDiscussionBoardArticle.IDeleteRequest = {
    created_after: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
    created_before: new Date().toISOString(),
  } satisfies IDiscussionBoardArticle.IDeleteRequest;
  await api.functional.discussionBoard.member.articles.erase(memberConnection, {
    body: deleteRequest2,
  });
  // Test 3: Bulk deletion with title pattern filter
  const deleteRequest3: IDiscussionBoardArticle.IDeleteRequest = {
    title_pattern: "%test%",
  } satisfies IDiscussionBoardArticle.IDeleteRequest;
  await api.functional.discussionBoard.member.articles.erase(memberConnection, {
    body: deleteRequest3,
  });
  // Test 4: Bulk deletion with combined filters
  const deleteRequest4: IDiscussionBoardArticle.IDeleteRequest = {
    author_id: member.id,
    status: "published",
    created_after: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    title_pattern: "%discussion%",
  } satisfies IDiscussionBoardArticle.IDeleteRequest;
  await api.functional.discussionBoard.member.articles.erase(memberConnection, {
    body: deleteRequest4,
  });
}
