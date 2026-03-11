import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardArticleCollector {
  export async function collect(props: {
    body: IDiscussionBoardArticle.ICreate;
    discussionBoardMembers: IEntity;
    discussionBoardMemberSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      title: props.body.title,
      content: props.body.content,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      section: { connect: { id: props.body.sectionId } },
      author: { connect: { id: props.discussionBoardMembers.id } },
      // HasMany relations - files
      files: props.body.fileUrls?.length
        ? {
            create: await ArrayUtil.asyncMap(
              props.body.fileUrls,
              async (url, i) => ({
                id: v4(),
                name: url.split("/").pop() ?? `file_${i}`,
                original_name: url.split("/").pop() ?? `file_${i}`,
                mime_type: "application/octet-stream",
                size: 0,
                path: url,
                created_at: new Date(),
                updated_at: new Date(),
                deleted_at: null,
                member: { connect: { id: props.discussionBoardMembers.id } },
              }),
            ),
          }
        : undefined,
      // HasMany relations - images
      images: props.body.imageUrls?.length
        ? {
            create: await ArrayUtil.asyncMap(
              props.body.imageUrls,
              async (url, i) => ({
                id: v4(),
                name: url.split("/").pop() ?? `image_${i}`,
                size: 0,
                type: "image/jpeg",
                url,
                width: 0,
                height: 0,
                created_at: new Date(),
                updated_at: new Date(),
                deleted_at: null,
              }),
            ),
          }
        : undefined,
      // HasMany relations - tags (deduplicate)
      tags: props.body.tags?.length
        ? {
            create: await ArrayUtil.asyncMap(
              Array.from(new Set(props.body.tags)),
              async (tagName) => ({
                id: v4(),
                created_at: new Date(),
                tag: {
                  connectOrCreate: {
                    where: { name: tagName },
                    create: {
                      id: v4(),
                      name: tagName,
                      created_at: new Date(),
                      updated_at: new Date(),
                    },
                  },
                },
              }),
            ),
          }
        : undefined,
    } satisfies Prisma.discussion_board_articlesCreateInput;
  }
}
