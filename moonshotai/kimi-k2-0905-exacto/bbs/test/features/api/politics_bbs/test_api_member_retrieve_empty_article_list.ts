import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPoliticsBbsArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsArticle";
import type { IPoliticsBbsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsCategory";
import type { IPoliticsBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsMember";

/**
 * Test that a newly registered member with no articles will receive an empty
 * article list.
 *
 * This test validates the system handles edge cases gracefully for new members
 * by ensuring the API returns an appropriate empty response rather than an
 * error when the member has not created any articles yet.
 */
export async function test_api_member_retrieve_empty_article_list(
  connection: api.IConnection,
) {
  // Create a new member account
  const username = `testuser_${RandomGenerator.alphaNumeric(8)}`;
  const email = `test_${RandomGenerator.name(1)}@example.com`;

  const member = await api.functional.auth.members.join(connection, {
    body: {
      username: username,
      email: email,
      password: "testPassword123",
      href: "https://example.com/signup",
      referrer: "https://example.com",
    } satisfies IPoliticsBbsMember.IJoin,
  });
  typia.assert(member);

  // Retrieve the member's articles (should return empty list)
  const articleList =
    await api.functional.politicsBbs.member.members.me.articles.at(connection);
  typia.assert(articleList);

  // Validate empty article list response
  TestValidator.equals(
    "article list data should be empty",
    articleList.data,
    [],
  );
  TestValidator.equals(
    "pagination.current should be 0",
    articleList.pagination.current,
    0,
  );
  TestValidator.equals(
    "pagination.limit should be 0",
    articleList.pagination.limit,
    0,
  );
  TestValidator.equals(
    "pagination.records should be 0",
    articleList.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination.pages should be 0",
    articleList.pagination.pages,
    0,
  );
}
