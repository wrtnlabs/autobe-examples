import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSectionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionStatistic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSectionStatisticTransformer } from "../transformers/DiscussionBoardSectionStatisticTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminSectionsSectionIdStatistics(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionStatistic.IUpdate;
}): Promise<IDiscussionBoardSectionStatistic> {
  // Verify section exists and is active
  await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
    where: {
      id: props.sectionId,
      deleted_at: null,
    },
  });
  // Validate count values are non-negative
  if (props.body.viewCount !== undefined && props.body.viewCount < 0) {
    throw new HttpException("View count must be a non-negative integer", 400);
  }
  if (props.body.articleCount !== undefined && props.body.articleCount < 0) {
    throw new HttpException(
      "Article count must be a non-negative integer",
      400,
    );
  }
  if (props.body.commentCount !== undefined && props.body.commentCount < 0) {
    throw new HttpException(
      "Comment count must be a non-negative integer",
      400,
    );
  }
  // Prepare update data with conditional field updates
  const updateData: Record<string, any> = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (props.body.viewCount !== undefined) {
    updateData.view_count = props.body.viewCount;
  }
  if (props.body.articleCount !== undefined) {
    updateData.article_count = props.body.articleCount;
  }
  if (props.body.commentCount !== undefined) {
    updateData.comment_count = props.body.commentCount;
  }
  if (props.body.lastActivityAt !== undefined) {
    updateData.last_activity_at = props.body.lastActivityAt;
  }
  // Use transaction for atomic upsert
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    const existingStats =
      await tx.discussion_board_section_statistics.findUnique({
        where: { discussion_board_section_id: props.sectionId },
        ...DiscussionBoardSectionStatisticTransformer.select(),
      });
    if (existingStats) {
      // Update existing statistics
      return await tx.discussion_board_section_statistics.update({
        where: { discussion_board_section_id: props.sectionId },
        data: updateData,
        ...DiscussionBoardSectionStatisticTransformer.select(),
      });
    } else {
      // Create new statistics record with default values
      return await tx.discussion_board_section_statistics.create({
        data: {
          id: v4(),
          discussion_board_section_id: props.sectionId,
          view_count: props.body.viewCount ?? 0,
          article_count: props.body.articleCount ?? 0,
          comment_count: props.body.commentCount ?? 0,
          last_activity_at:
            props.body.lastActivityAt ?? toISOStringSafe(new Date()),
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
        },
        ...DiscussionBoardSectionStatisticTransformer.select(),
      });
    }
  });
  return await DiscussionBoardSectionStatisticTransformer.transform(result);
}
