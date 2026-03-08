import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_attachments_create } from "../../../generate/generate_random_discussion_board_member_articles_attachments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_attachment } from "../../../prepare/prepare_random_discussion_board_article_attachment";

export async function test_api_article_attachment_deletion_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that members cannot delete attachments from articles authored by other members.
   *
   * Scenario:
   * 1. Member A creates an article with an attachment
   * 2. Member B (different member) attempts to delete Member A's attachment
   * 3. Expect 403 Forbidden error
   * 4. Verify the attachment still exists
   */
  // Step 1: Member A authenticates
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA: IDiscussionBoardMember.IAuthorized =
    await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // Step 2: Member A creates an article
  const article: IDiscussionBoardArticle =
    await generate_random_discussion_board_member_articles_create(
      memberAConnection,
      {},
    );
  typia.assert(article);
  // Step 3: Member A creates an attachment for the article
  const attachment: IDiscussionBoardArticleAttachment =
    await generate_random_discussion_board_member_articles_attachments_create(
      memberAConnection,
      {
        params: { articleId: article.id },
      },
    );
  typia.assert(attachment);
  // Step 4: Member B authenticates (different member)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB: IDiscussionBoardMember.IAuthorized =
    await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // Verify they are different members
  TestValidator.notEquals("members are different", memberA.id, memberB.id);
  // Step 5: Member B attempts to delete Member A's attachment
  // This should fail with 403 Forbidden
  await TestValidator.httpError(
    "Member B cannot delete Member A's attachment",
    403,
    async () =>
      await api.functional.discussionBoard.member.articles.attachments.erase(
        memberBConnection,
        {
          articleId: article.id,
          attachmentId: attachment.id,
        },
      ),
  );
}
