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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAttachmentThumbnailTransformer } from "../transformers/DiscussionBoardAttachmentThumbnailTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminThumbnailsThumbnailId(props: {
  admin: AdminPayload;
  thumbnailId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAttachmentThumbnail> {
  const thumbnail =
    await MyGlobal.prisma.discussion_board_attachment_thumbnails.findUniqueOrThrow(
      {
        where: {
          id: props.thumbnailId,
          deleted_at: null,
        },
        ...DiscussionBoardAttachmentThumbnailTransformer.select(),
      },
    );
  return await DiscussionBoardAttachmentThumbnailTransformer.transform(
    thumbnail,
  );
}
