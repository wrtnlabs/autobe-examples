import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_attachment } from "../prepare/prepare_random_discussion_board_attachment";

export async function generate_random_discussion_board_super_admin_articles_attachments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardAttachment.ICreate>;
    params: {
      articleId: string;
    };
  },
): Promise<IDiscussionBoardAttachment> {
  const prepared: IDiscussionBoardAttachment.ICreate =
    prepare_random_discussion_board_attachment(props.body);
  const result: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.superAdmin.articles.attachments.create(
      connection,
      {
        articleId: props.params.articleId,
        body: prepared,
      },
    );
  return result;
}
