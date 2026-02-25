import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardArticleImageAtListTransformer {
  export type Payload = Prisma.discussion_board_article_imagesGetPayload<
    ReturnType<typeof select>
  >[];
  export function select() {
    return {
      select: {
        id: true,
        image_url: true,
        description: true,
        display_order: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        article: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_article_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleImage.IList> {
    return {
      data: input.map((item: Payload[number]) => ({
        id: item.id,
        discussionBoardArticleId: item.article.id,
        imageUrl: item.image_url,
        description: item.description ?? null,
        displayOrder: item.display_order,
        createdAt: toISOStringSafe(item.created_at),
        updatedAt: toISOStringSafe(item.updated_at),
        deletedAt:
          item.deleted_at !== null ? toISOStringSafe(item.deleted_at) : null,
      })),
    };
  }
}
