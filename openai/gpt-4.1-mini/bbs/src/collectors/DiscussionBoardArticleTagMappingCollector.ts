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
    article: IEntity;
    tag: IEntity;
  }) {
    const id = v4();
    return {
      id,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      article: { connect: { id: props.article.id } },
      tag: { connect: { id: props.tag.id } },
    } satisfies Prisma.discussion_board_article_tag_mappingsCreateInput;
  }
}
