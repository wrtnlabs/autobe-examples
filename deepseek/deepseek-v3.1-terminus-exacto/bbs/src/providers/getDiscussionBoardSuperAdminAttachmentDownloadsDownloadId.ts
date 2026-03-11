import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IDiscussionBoardAttachmentDownload } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentDownload";
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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAttachmentDownloadTransformer } from "../transformers/DiscussionBoardAttachmentDownloadTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminAttachmentDownloadsDownloadId(props: {
  superAdmin: SuperadminPayload;
  downloadId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAttachmentDownload> {
  // Query the download record with transformer select
  const download =
    await MyGlobal.prisma.discussion_board_attachment_downloads.findUniqueOrThrow(
      {
        where: { id: props.downloadId, deleted_at: null },
        ...DiscussionBoardAttachmentDownloadTransformer.select(),
      },
    );
  // Transform using the existing transformer
  return await DiscussionBoardAttachmentDownloadTransformer.transform(download);
}
