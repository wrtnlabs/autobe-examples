import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeOwnerAttachmentsBatchCleanup(props: {
  owner: OwnerPayload;
  body: IRedditLikeAttachment.ICleanup;
}): Promise<IRedditLikeAttachment.ICleanupResult> {
  const errors: string[] = [];
  // Build where clause based on cleanup criteria
  let where: Prisma.reddit_like_attachmentsWhereInput = {
    deleted_at: { not: null },
  };
  // Add deletedBefore filter if provided
  if (
    props.body.deletedBefore !== null &&
    props.body.deletedBefore !== undefined
  ) {
    where = {
      ...where,
      deleted_at: {
        not: null,
        lt: props.body.deletedBefore,
      },
    };
  }
  // Add orphaned filter if requested
  if (props.body.orphanedOnly) {
    where = {
      ...where,
      references: {
        none: {},
      },
    };
  }
  // Find attachments matching criteria
  const attachments = await MyGlobal.prisma.reddit_like_attachments.findMany({
    where,
    select: {
      id: true,
      file_size_bytes: true,
    },
  });
  let totalBytesFreed = 0;
  // Process deletions if not dry run
  if (!props.body.dryRun) {
    for (const attachment of attachments) {
      try {
        // Delete thumbnails
        await MyGlobal.prisma.reddit_like_attachment_thumbnails.deleteMany({
          where: {
            attachment: {
              id: attachment.id,
            },
          },
        });
        // Delete access logs
        await MyGlobal.prisma.reddit_like_attachment_access_logs.deleteMany({
          where: {
            attachment: {
              id: attachment.id,
            },
          },
        });
        // Delete reference subtype records for profiles
        await MyGlobal.prisma.reddit_like_attachment_reference_of_profiles.deleteMany(
          {
            where: {
              attachmentReference: {
                attachment: {
                  id: attachment.id,
                },
              },
            },
          },
        );
        // Delete reference subtype records for communities
        await MyGlobal.prisma.reddit_like_attachment_reference_of_communities.deleteMany(
          {
            where: {
              attachmentReference: {
                attachment: {
                  id: attachment.id,
                },
              },
            },
          },
        );
        // Delete reference subtype records for posts
        await MyGlobal.prisma.reddit_like_attachment_reference_of_posts.deleteMany(
          {
            where: {
              attachmentReference: {
                attachment: {
                  id: attachment.id,
                },
              },
            },
          },
        );
        // Delete attachment references
        await MyGlobal.prisma.reddit_like_attachment_references.deleteMany({
          where: {
            attachment: {
              id: attachment.id,
            },
          },
        });
        // Delete the attachment
        await MyGlobal.prisma.reddit_like_attachments.delete({
          where: { id: attachment.id },
        });
        totalBytesFreed += attachment.file_size_bytes;
      } catch (error) {
        errors.push(
          `Failed to delete attachment ${attachment.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  } else {
    // Dry run: just calculate bytes that would be freed
    totalBytesFreed = attachments.reduce(
      (sum, attachment) => sum + attachment.file_size_bytes,
      0,
    );
  }
  return {
    cleanedCount: attachments.length,
    totalBytesFreed,
    dryRun: props.body.dryRun ?? false,
    errors,
  };
}
