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
import { generate_random_discussion_board_member_sections_articles_create } from "../../../generate/generate_random_discussion_board_member_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_discussion_board_article_update_by_other_member_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member user (article author)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Token = await authorize_member_join(member1Connection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  // Create new connection with member1's token
  const member1AuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${member1Token.token.access}`,
    },
  };
  // 2. Create a section for the article (we need a section ID)
  // For this test, we'll use a random section ID as we don't have section creation endpoint
  const sectionId = typia.random<string>();
  // 3. Member1 creates an article
  const article =
    await api.functional.discussionBoard.member.sections.articles.create(
      member1AuthConnection,
      {
        sectionId: sectionId,
        body: typia.random<IDiscussionBoardArticle.ICreate>(),
      },
    );
  typia.assert(article);
  // 4. Create second member user (attempting unauthorized update)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Token = await authorize_member_join(member2Connection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  // Create new connection with member2's token
  const member2AuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${member2Token.token.access}`,
    },
  };
  // 5. Member2 attempts to update member1's article (should be forbidden)
  await TestValidator.error(
    "member2 cannot update member1's article",
    async () => {
      await api.functional.discussionBoard.member.articles.update(
        member2AuthConnection,
        {
          articleId: (article as any).id,
          body: typia.random<IDiscussionBoardArticle.IUpdate>(),
        },
      );
    },
  );
}
