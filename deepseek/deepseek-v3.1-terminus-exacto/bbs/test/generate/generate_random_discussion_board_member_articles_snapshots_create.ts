import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_article_snapshot } from "../prepare/prepare_random_discussion_board_article_snapshot";

export async function generate_random_discussion_board_member_articles_snapshots_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardArticleSnapshot.ICreate> | undefined;
  },
): Promise<IDiscussionBoardArticleSnapshot> {
  const prepared: IDiscussionBoardArticleSnapshot.ICreate =
    prepare_random_discussion_board_article_snapshot(props.body);
  const result: IDiscussionBoardArticleSnapshot =
    await api.functional.discussionBoard.member.articles.snapshots.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
