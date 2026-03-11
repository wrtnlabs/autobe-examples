import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { generate_random_discussion_board_member_articles_snapshots_create } from "../../../generate/generate_random_discussion_board_member_articles_snapshots_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_snapshot } from "../../../prepare/prepare_random_discussion_board_article_snapshot";

export async function test_api_article_snapshots_retrieval_when_snapshot_belongs_to_different_article(
  connection: api.IConnection,
): Promise<void> {
  // Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Create first article
  const firstArticle =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {},
    );
  typia.assert(firstArticle);
  // Create second article
  const secondArticle =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {},
    );
  typia.assert(secondArticle);
  // Create snapshot of the first article
  const snapshot =
    await generate_random_discussion_board_member_articles_snapshots_create(
      memberConnection,
      {
        body: {
          discussion_board_article_id: firstArticle.id,
          snapshot_reason: "Test snapshot creation",
        } satisfies IDiscussionBoardArticleSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  // Attempt to retrieve the first article's snapshot using the second article's ID
  await TestValidator.error(
    "snapshot retrieval should fail when snapshot belongs to different article",
    async () => {
      await api.functional.discussionBoard.articles.snapshots.at(
        memberConnection,
        {
          articleId: secondArticle.id,
          snapshotId: snapshot.id,
        },
      );
    },
  );
}
