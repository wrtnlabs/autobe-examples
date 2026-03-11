import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardArticleFileCollector {
  export async function collect(props: {
    body: IDiscussionBoardArticleFile.ICreate;
    article: IEntity;
    member: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      original_name: props.body.original_name,
      mime_type: props.body.mime_type,
      size: props.body.size,
      path: props.body.path,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      article: { connect: { id: props.article.id } },
      member: { connect: { id: props.member.id } },
    } satisfies Prisma.discussion_board_article_filesCreateInput;
  }
}
