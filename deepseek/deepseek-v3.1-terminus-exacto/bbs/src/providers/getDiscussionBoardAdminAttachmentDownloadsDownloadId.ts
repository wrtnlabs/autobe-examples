import { IDiscussionBoardAttachmentDownload } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentDownload";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAttachmentDownloadAtAttachmentTransformer } from "../transformers/DiscussionBoardAttachmentDownloadAtAttachmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminAttachmentDownloadsDownloadId(props: {
  admin: AdminPayload;
  downloadId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAttachmentDownload.IAttachment> {
  // Get the download record with attachment and admin ownership
  const download =
    await MyGlobal.prisma.discussion_board_attachment_downloads.findUniqueOrThrow(
      {
        where: {
          id: props.downloadId,
          deleted_at: null,
          actor_type: "admin",
        },
        select: {
          id: true,
          actor_type: true,
          attachment:
            DiscussionBoardAttachmentDownloadAtAttachmentTransformer.select(),
          adminDownloadReference: {
            select: {
              admin: {
                select: {
                  id: true,
                },
              },
            },
          } satisfies Prisma.discussion_board_attachment_download_adminsFindManyArgs,
        },
      },
    );
  // Verify admin ownership exists
  if (!download.adminDownloadReference) {
    throw new HttpException("Download does not belong to an admin", 400);
  }
  // IMPORTANT: Based on adminAuthorize provider, AdminPayload.id is user_id not admin ID
  // The adminAuthorize uses: where: { user_id: payload.id }
  // So we need to check admin.discussion_board_admin_id matches something else
  // Looking at schema: discussion_board_admins has id (PK) and user_id (FK to users)
  // discussion_board_attachment_download_admins has discussion_board_admin_id (FK to admin.id)
  // AdminPayload.id is user_id from adminAuthorize
  // Need to find admin record first to verify ownership
  const adminRecord =
    await MyGlobal.prisma.discussion_board_admins.findFirstOrThrow({
      where: {
        id: props.admin.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  // Now verify the download belongs to this admin
  if (download.adminDownloadReference.admin.id !== adminRecord.id) {
    throw new HttpException(
      "Forbidden: You don't have permission to view this download",
      403,
    );
  }
  return await DiscussionBoardAttachmentDownloadAtAttachmentTransformer.transform(
    download.attachment,
  );
}
