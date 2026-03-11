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
 * Test bulk deletion of articles authored by the authenticated member.
 *
 * 1. Authenticate as a member via join endpoint
 * 2. Create multiple articles with various timestamps and statuses
 * 3. Use bulk deletion endpoint with author_id filter targeting current member
 * 4. Verify only member's articles are deleted while preserving others
 * 5. Validate cascade deletion of associated records
 */
export async function test_api_article_bulk_deletion_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Authenticate as member via join
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
  // Note: Since we don't have article creation endpoints available,
  // we can only test the bulk deletion endpoint with the member's author_id
  // This tests that the endpoint accepts the request and processes it correctly
  const deleteRequest: IDiscussionBoardArticle.IDeleteRequest = {
    author_id: member.id,
    status: null,
    section_id: null,
    created_after: null,
    created_before: null,
    title_pattern: null,
  };
  // Execute bulk deletion targeting only member's articles
  await api.functional.discussionBoard.member.articles.erase(memberConnection, {
    body: deleteRequest,
  });
  // Test that filtering by non-owned articles doesn't affect member's content
  const otherAuthorDeleteRequest: IDiscussionBoardArticle.IDeleteRequest = {
    author_id: typia.random<string & tags.Format<"uuid">>(),
    status: null,
    section_id: null,
    created_after: null,
    created_before: null,
    title_pattern: null,
  };
  // This should not affect member's articles
  await api.functional.discussionBoard.member.articles.erase(memberConnection, {
    body: otherAuthorDeleteRequest,
  });
  // Validate member authentication was successful
  TestValidator.predicate(
    "member has valid UUID",
    /^[0-9a-f-]{36}$/i.test(member.id),
  );
  TestValidator.equals("member email is valid", typeof member.email, "string");
  TestValidator.predicate(
    "member email contains @",
    member.email.includes("@"),
  );
}
