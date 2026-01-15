import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArchive";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardArchiveTransformer {
  export type Payload = Prisma.discussion_board_archivesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content_type: true,
        content_id: true,
        created_at: true,
        updated_at: true,
        archived_at: true,
        archived_by: true,
        reason: true,
        archive_reason_code: true,
        content_data: true,
        post: true,
        comment: true,
        image: true,
        file: true,
        moderationAction: true,
      },
    } satisfies Prisma.discussion_board_archivesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArchive> {
    return {
      id: input.id,
      article_id: input.content_id,
      author_id: "", // Not available in archive record - empty string for string type
      title: "", // Not available in archive record - empty string for string type
      content: input.content_data,
      created_at: toISOStringSafe(input.created_at), // Use provided toISOStringSafe function
      archived_at: toISOStringSafe(input.archived_at), // Use provided toISOStringSafe function
      archived_by: input.archived_by ?? "", // Handle null case - empty string for string type
      archival_reason: input.reason ?? input.archive_reason_code,
      original_status: "", // Not available in archive record - empty string for string type
      original_category_id: "", // Not available in archive record - empty string for string type
      is_public: false, // Not available in archive record - false for boolean type
      view_count: 0, // Not available in archive record - 0 for number type
      comment_count: 0, // Not available in archive record - 0 for number type
      like_count: 0, // Not available in archive record - 0 for number type
      report_count: 0, // Not available in archive record - 0 for number type
      is_permanent: false, // Not available in archive record - false for boolean type
      legal_hold_flag: false, // Not available in archive record - false for boolean type
    };
  }
}
