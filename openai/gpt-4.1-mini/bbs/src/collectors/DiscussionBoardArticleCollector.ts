import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachmentReference";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardArticleCollector {
  export async function collect(props: {
    body: IDiscussionBoardArticle.ICreate;
    author: IEntity;
  }) {
    const now = new Date();
    const id = v4();
    return {
      id,
      title: props.body.title,
      content: props.body.content,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      author: { connect: { id: props.author.id } },
      section: { connect: { id: props.body.sectionId } },
      images: undefined, // Unable to create nested for images due to no attachment details
      tagMappings:
        props.body.tags && props.body.tags.length > 0
          ? {
              create: await Promise.all(
                props.body.tags.map(async (tag) => ({
                  id: v4(),
                  created_at: now,
                  updated_at: now,
                  tag: {
                    connectOrCreate: {
                      where: { name: tag }, // Use 'name' as unique key instead of value
                      create: {
                        id: v4(),
                        name: tag,
                        created_at: now,
                        updated_at: now,
                      },
                    },
                  },
                })),
              ),
            }
          : undefined,
      files: undefined, // Unable to create nested for files due to no attachment details
      comments: undefined,
      searchIndexes: undefined,
      articleTags: undefined,
    } satisfies Prisma.discussion_board_articlesCreateInput;
  }
}
