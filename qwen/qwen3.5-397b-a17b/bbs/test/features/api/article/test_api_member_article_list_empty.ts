import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving articles for a member account that exists but has not written any articles.
 * Verify the response returns an empty data array while still including valid pagination metadata.
 * Confirm the member's profile information is accessible and the operation does not return 404.
 * This validates the system correctly handles the edge case of members with no article history
 * while maintaining proper pagination structure.
 */
export async function test_api_member_article_list_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account (without any articles)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  // 2. Retrieve articles for this member (should be empty since newly created)
  const articles = await api.functional.discussionBoard.members.articles.index(
    memberConnection,
    {
      memberId: member.id,
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(articles);
  // 3. Validate empty data array with proper pagination metadata
  TestValidator.equals("data array is empty", articles.data.length, 0);
  TestValidator.equals("current page", articles.pagination.current, 1);
  TestValidator.equals("limit", articles.pagination.limit, 20);
  TestValidator.equals("total records", articles.pagination.records, 0);
  TestValidator.equals("total pages", articles.pagination.pages, 0);
}
