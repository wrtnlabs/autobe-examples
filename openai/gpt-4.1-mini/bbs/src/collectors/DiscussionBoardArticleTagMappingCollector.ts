import { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardArticleTagMappingCollector {
  export async function collect(props: {
    body: IDiscussionBoardArticleTagMapping.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      article: { connect: { id: props.body.discussion_board_article_id } },
      tag: { connect: { id: props.body.discussion_board_tag_id } },
    } satisfies Prisma.discussion_board_article_tag_mappingsCreateInput;
  }
}
