import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { DiscussionBoardArticleFileCollector } from "./DiscussionBoardArticleFileCollector";
import { DiscussionBoardArticleImageCollector } from "./DiscussionBoardArticleImageCollector";

export namespace DiscussionBoardArticleCollector {
  export async function collect(props: {
    body: IDiscussionBoardArticle.ICreate;
    author: IEntity;
    session: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      title: props.body.title,
      content: props.body.content,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      section: { connect: { id: props.body.sectionId } },
      author: { connect: { id: props.author.id } },
      files: props.body.files?.length
        ? {
            create: await ArrayUtil.asyncMap(props.body.files, (file) =>
              DiscussionBoardArticleFileCollector.collect({
                body: file,
                discussionBoardArticles: { id },
              }),
            ),
          }
        : undefined,
      images: props.body.images?.length
        ? {
            create: await ArrayUtil.asyncMap(props.body.images, (image) =>
              DiscussionBoardArticleImageCollector.collect({
                body: image,
                discussionBoardArticles: { id },
              }),
            ),
          }
        : undefined,
      articleTags: props.body.tags?.length
        ? {
            create: await ArrayUtil.asyncMap(props.body.tags, async (tag) => ({
              id: v4(),
              created_at: new Date(),
              updated_at: new Date(),
              tag: {
                connectOrCreate: {
                  where: { value: tag.toLowerCase() },
                  create: {
                    id: v4(),
                    value: tag.toLowerCase(),
                    created_at: new Date(),
                    updated_at: new Date(),
                  },
                },
              },
            })),
          }
        : undefined,
    } satisfies Prisma.discussion_board_articlesCreateInput;
  }
}
