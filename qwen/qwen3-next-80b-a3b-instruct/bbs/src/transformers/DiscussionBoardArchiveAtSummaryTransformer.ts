import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArchive";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardArchiveAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_archivesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content_type: true,
        content_id: true,
        content_data: true,
        created_at: true,
        updated_at: true,
        archived_at: true,
        reason: true,
        archive_reason_code: true,
        archived_by: true,
        moderationAction: {
          select: {
            moderator_id: true,
            system_triggered: true,
            appeal_available: true,
            appeal_status: true,
          },
        },
        post: {
          select: {
            tags: true,
            published_at: true,
            reports_count: true,
          },
        },
        comment: {
          select: {
            id: true,
          },
        },
        image: {
          select: {},
        },
        file: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_archivesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArchive.ISummary> {
    // Extract title from content_data (assuming it's JSON string with title property)
    // Extract tags, category, etc. from post (assuming JSON structure)
    const contentData =
      typeof input.content_data === "string"
        ? JSON.parse(input.content_data)
        : input.content_data;
    const post = input.post
      ? typeof input.post === "string"
        ? JSON.parse(input.post)
        : input.post
      : null;
    // Count files and images
    const archivedFilesCount = input.file ? 1 : 0;
    const archivedImagesCount = input.image ? 1 : 0;
    // Count comments and reports from relation existence and field
    const commentsCount = input.comment ? 1 : 0;
    const reportsCount = post?.reports_count || 0;
    return {
      id: input.id,
      title: contentData?.title || "",
      content_summary:
        input.content_data?.length > 500
          ? input.content_data.substring(0, 500) + "..."
          : input.content_data || "",
      author_id: input.archived_by ?? "",
      author_username: input.archived_by ?? "",
      archived_at: toISOStringSafe(input.archived_at),
      reason: input.reason || input.archive_reason_code || "",
      moderator_id: input.moderationAction?.moderator_id ?? "",
      moderator_username: "",
      archived_files_count: archivedFilesCount,
      archived_images_count: archivedImagesCount,
      comments_count: commentsCount,
      reports_count: reportsCount,
      status: "published",
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      published_at: post?.published_at
        ? toISOStringSafe(post.published_at)
        : toISOStringSafe(input.created_at),
      category_id: post?.category_id || "",
      category_name: post?.category_name || "",
      tags: post?.tags || [],
      thumbnail_url: input.image?.url || "",
      thumbnail_filename: input.image?.name || "",
      archived_by_system: input.moderationAction?.system_triggered || false,
      appeal_available: input.moderationAction?.appeal_available || false,
      appeal_status: input.moderationAction?.appeal_status || "none",
    };
  }
}
