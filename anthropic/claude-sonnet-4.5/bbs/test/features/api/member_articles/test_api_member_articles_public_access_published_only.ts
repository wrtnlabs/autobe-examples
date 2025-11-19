import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test that unauthenticated guests can only view published articles for a
 * specific member.
 *
 * This test validates the authorization logic for guest access to member
 * articles:
 *
 * 1. Creates a member account to establish a valid memberId
 * 2. Switches to unauthenticated context (guest access)
 * 3. Retrieves articles for the memberId without authentication
 * 4. Verifies that only published articles are returned (if any exist)
 * 5. Confirms all returned articles have published status
 *
 * Note: This test validates the authorization filter behavior. It does not
 * create articles because no article creation endpoints are available in the
 * provided API.
 */
export async function test_api_member_articles_public_access_published_only(
  connection: api.IConnection,
) {
  // Step 1: Create member account to get a valid memberId
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.Format<"password">>();
  const memberUsername = RandomGenerator.alphaNumeric(12);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: memberUsername,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create unauthenticated connection for guest access
  const guestConnection: api.IConnection = { ...connection, headers: {} };

  // Step 3: Retrieve articles as unauthenticated guest
  const guestArticles =
    await api.functional.discussionBoard.members.articles.index(
      guestConnection,
      {
        memberId: member.id,
        body: {} satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(guestArticles);

  // Step 4: Validate response structure
  TestValidator.predicate(
    "guest access returns valid page structure",
    Array.isArray(guestArticles.data),
  );

  // Step 5: Verify all returned articles have published status only
  // Guest users should NEVER see draft or archived articles
  guestArticles.data.forEach((article, index) => {
    TestValidator.equals(
      `article ${index} status must be published for guest access`,
      article.status,
      "published",
    );
  });

  // Step 6: Verify no draft or archived articles are present
  const hasDraftArticles = guestArticles.data.some((a) => a.status === "draft");
  const hasArchivedArticles = guestArticles.data.some(
    (a) => a.status === "archived",
  );

  TestValidator.predicate(
    "no draft articles visible to guest users",
    !hasDraftArticles,
  );

  TestValidator.predicate(
    "no archived articles visible to guest users",
    !hasArchivedArticles,
  );
}
