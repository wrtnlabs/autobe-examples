import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_attachment } from "../prepare/prepare_random_discussion_board_attachment";

export async function generate_random_discussion_board_member_articles_attachments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardAttachment.ICreate> | undefined;
    params: {
      articleId: string;
    };
  },
): Promise<IDiscussionBoardAttachment> {
  const prepared: IDiscussionBoardAttachment.ICreate =
    prepare_random_discussion_board_attachment(props.body);
  const result: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        body: prepared,
        articleId: props.params.articleId,
      },
    );
  return result;
}
