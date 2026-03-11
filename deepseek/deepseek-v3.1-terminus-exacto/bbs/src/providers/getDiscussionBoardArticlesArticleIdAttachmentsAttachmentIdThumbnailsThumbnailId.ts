import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IDiscussionBoardAttachmentThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentThumbnail";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardAttachmentThumbnailTransformer } from "../transformers/DiscussionBoardAttachmentThumbnailTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardArticlesArticleIdAttachmentsAttachmentIdThumbnailsThumbnailId(props: {
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
  thumbnailId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAttachmentThumbnail> {
  // Verify article exists and is not deleted
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId, deleted_at: null },
  });
  // Verify attachment belongs to the article and get thumbnail in one query using relation filters
  const thumbnail =
    await MyGlobal.prisma.discussion_board_attachment_thumbnails.findFirstOrThrow(
      {
        where: {
          id: props.thumbnailId,
          deleted_at: null,
          attachment: {
            id: props.attachmentId,
            deleted_at: null,
            article: {
              id: props.articleId,
              deleted_at: null,
            },
          },
        },
        ...DiscussionBoardAttachmentThumbnailTransformer.select(),
      },
    );
  return await DiscussionBoardAttachmentThumbnailTransformer.transform(
    thumbnail,
  );
}
