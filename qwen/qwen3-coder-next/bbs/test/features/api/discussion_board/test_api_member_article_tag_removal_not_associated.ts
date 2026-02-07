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

export async function test_api_member_article_tag_removal_not_associated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      /* IDiscussionBoardMember.IJoin has no required fields */
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // Create new connection with the obtained token
  const authenticatedMemberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuth.token.access,
    },
  };
  // 2. Create an article without tags
  // First, we need a section ID - generate a random one for testing
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const article =
    await api.functional.discussionBoard.member.sections.articles.create(
      authenticatedMemberConnection,
      {
        sectionId: sectionId,
        body: {
          /* IDiscussionBoardArticle.ICreate has no required fields */
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 3. Generate a random tag ID that was never associated with this article
  const tagId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to remove the non-associated tag - should succeed (idempotent)
  await api.functional.discussionBoard.member.articles.tags.eraseTag(
    authenticatedMemberConnection,
    {
      articleId: (article as any).id,
      tagId: tagId,
    },
  );
  // No error means success - the endpoint handles non-existent associations gracefully
  // 5. Verify the operation completed successfully (no exception thrown means success)
}