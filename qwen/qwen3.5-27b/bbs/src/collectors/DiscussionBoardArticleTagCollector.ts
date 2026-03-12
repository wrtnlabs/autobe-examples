import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardArticleTagCollector {
  export async function collect(props: {
    body: IDiscussionBoardArticleTag.ICreate;
    discussionBoardArticles: IEntity;
  }) {
    const records = await ArrayUtil.asyncMap(
      props.body.tagNames,
      async (tagName) => {
        const id: string = v4();
        return {
          id,
          created_at: new Date(),
          article: { connect: { id: props.discussionBoardArticles.id } },
          tag: {
            connectOrCreate: {
              where: { name: tagName },
              create: {
                id: v4(),
                name: tagName,
                created_at: new Date(),
                updated_at: new Date(),
                deleted_at: null,
              },
            },
          },
        } satisfies Prisma.discussion_board_article_tagsCreateInput;
      },
    );
    return records;
  }
}
