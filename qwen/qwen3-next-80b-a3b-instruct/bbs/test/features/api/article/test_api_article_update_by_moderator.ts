import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { generate_random_discussion_board_citizen_articles_create } from "../../../generate/generate_random_discussion_board_citizen_articles_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_article_update_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create moderator account via join
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorPassword = RandomGenerator.alphaNumeric(16);
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IAdmin.IAuthorized = await authorize_admin_join(
    moderatorConnection,
    {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies IAdmin.IJoin,
    },
  );
  typia.assert(moderator);
  // Step 2: Create citizen account via join
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizen: IDiscussionBoardUser.IAuthorized = await authorize_member_join(
    citizenConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/referrer",
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(citizen);
  // Step 3: Create article as citizen
  const article: IDiscussionBoardArticle =
    await generate_random_discussion_board_citizen_articles_create(
      citizenConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 15,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // Step 4: Authenticate moderator via login using same connection
  await authorize_admin_login(moderatorConnection, {
    body: {
      email: moderatorEmail, // Use stored email from IAdmin.IJoin instead of non-existent property on IAdmin.IAuthorized
      password: moderatorPassword, // Only email and password are required in IAdmin.ILogin
    } satisfies IAdmin.ILogin,
  });
  // Step 5: Update article as moderator using moderator connection
  const updatedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.posts.update(
      moderatorConnection,
      {
        postId: article.id,
        body: {
          title: "Updated Title by Moderator",
          content: "Updated content by moderator with new information.",
          status: "published",
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(updatedArticle);
  // Step 6: Validate that article was updated
  TestValidator.equals(
    "title updated",
    updatedArticle.title,
    "Updated Title by Moderator",
  );
  TestValidator.equals(
    "content updated",
    updatedArticle.content,
    "Updated content by moderator with new information.",
  );
  TestValidator.equals("status updated", updatedArticle.status, "published");
}
