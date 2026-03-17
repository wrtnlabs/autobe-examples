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
  const dryRun = props.body.dryRun ?? false;
  // Build where clause for finding attachments to cleanup
  const whereInput = {
    deleted_at: {
      not: null,
      ...(props.body.deletedBefore !== undefined &&
      props.body.deletedBefore !== null
        ? { lt: props.body.deletedBefore }
        : {}),
    },
    ...(props.body.orphanedOnly === true
      ? {
          references: {
            none: {},
          },
        }
      : {}),
  } satisfies Prisma.reddit_like_attachmentsWhereInput;
  // Find attachments matching criteria
  const attachmentsToCleanup =
    await MyGlobal.prisma.reddit_like_attachments.findMany({
      where: whereInput,
      select: {
        id: true,
        file_size_bytes: true,
        storage_path: true,
      },
    });
  const cleanedCount = attachmentsToCleanup.length;
  const totalBytesFreed = attachmentsToCleanup.reduce(
    (sum, a) => sum + a.file_size_bytes,
    0,
  );
  if (dryRun || cleanedCount === 0) {
    return {
      cleanedCount,
      totalBytesFreed,
      dryRun,
      errors,
    };
  }
  // Delete attachments and associated records
  const attachmentIds = attachmentsToCleanup.map((a) => a.id);
  try {
    // Delete thumbnails (cascade from attachment)
    await MyGlobal.prisma.reddit_like_attachment_thumbnails.deleteMany({
      where: {
        reddit_like_attachment_id: { in: attachmentIds },
      },
    });
  } catch (e) {
    errors.push(
      `Failed to delete thumbnails: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  try {
    // Delete access logs (cascade from attachment)
    await MyGlobal.prisma.reddit_like_attachment_access_logs.deleteMany({
      where: {
        reddit_like_attachment_id: { in: attachmentIds },
      },
    });
  } catch (e) {
    errors.push(
      `Failed to delete access logs: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  // Find and delete reference subtype records first
  try {
    const referenceIds =
      await MyGlobal.prisma.reddit_like_attachment_references.findMany({
        where: {
          attachment_id: { in: attachmentIds },
        },
        select: { id: true },
      });
    const refIds = referenceIds.map((r) => r.id);
    if (refIds.length > 0) {
      // Delete subtype records
      await MyGlobal.prisma.reddit_like_attachment_reference_of_profiles.deleteMany(
        {
          where: {
            reddit_like_attachment_reference_id: { in: refIds },
          },
        },
      );
      await MyGlobal.prisma.reddit_like_attachment_reference_of_communities.deleteMany(
        {
          where: {
            attachment_reference_id: { in: refIds },
          },
        },
      );
      await MyGlobal.prisma.reddit_like_attachment_reference_of_posts.deleteMany(
        {
          where: {
            attachment_reference_id: { in: refIds },
          },
        },
      );
      // Delete main reference records
      await MyGlobal.prisma.reddit_like_attachment_references.deleteMany({
        where: {
          id: { in: refIds },
        },
      });
    }
  } catch (e) {
    errors.push(
      `Failed to delete references: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  // Finally delete the attachments
  try {
    await MyGlobal.prisma.reddit_like_attachments.deleteMany({
      where: {
        id: { in: attachmentIds },
      },
    });
  } catch (e) {
    errors.push(
      `Failed to delete attachments: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  return {
    cleanedCount,
    totalBytesFreed,
    dryRun,
    errors,
  };
}
