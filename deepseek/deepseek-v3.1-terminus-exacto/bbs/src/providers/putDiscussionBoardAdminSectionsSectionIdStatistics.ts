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

export async function putDiscussionBoardAdminSectionsSectionIdStatistics(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionStatistic.IUpdate;
}): Promise<IDiscussionBoardSectionStatistic> {
  // First verify the section exists
  const section =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: { id: props.sectionId },
    });
  // Validate input data
  const now = new Date();
  if (props.body.viewCount !== undefined && props.body.viewCount < 0) {
    throw new HttpException("View count must be non-negative", 400);
  }
  if (props.body.articleCount !== undefined && props.body.articleCount < 0) {
    throw new HttpException("Article count must be non-negative", 400);
  }
  if (props.body.commentCount !== undefined && props.body.commentCount < 0) {
    throw new HttpException("Comment count must be non-negative", 400);
  }
  if (props.body.lastActivityAt !== undefined) {
    const lastActivity = new Date(props.body.lastActivityAt);
    if (lastActivity > now) {
      throw new HttpException("Last activity cannot be in the future", 400);
    }
  }
  // Check if statistics record exists for this section
  const existingStatistic =
    await MyGlobal.prisma.discussion_board_section_statistics.findUnique({
      where: { discussion_board_section_id: props.sectionId },
    });
  let updatedStatistic;
  if (existingStatistic) {
    // Update existing record
    updatedStatistic =
      await MyGlobal.prisma.discussion_board_section_statistics.update({
        where: { id: existingStatistic.id },
        data: {
          view_count: props.body.viewCount ?? existingStatistic.view_count,
          article_count:
            props.body.articleCount ?? existingStatistic.article_count,
          comment_count:
            props.body.commentCount ?? existingStatistic.comment_count,
          last_activity_at: props.body.lastActivityAt
            ? new Date(props.body.lastActivityAt)
            : existingStatistic.last_activity_at,
          updated_at: now,
        },
        ...DiscussionBoardSectionStatisticTransformer.select(),
      });
  } else {
    // Create new record
    updatedStatistic =
      await MyGlobal.prisma.discussion_board_section_statistics.create({
        data: {
          id: v4(),
          discussion_board_section_id: props.sectionId,
          view_count: props.body.viewCount ?? 0,
          article_count: props.body.articleCount ?? 0,
          comment_count: props.body.commentCount ?? 0,
          last_activity_at: props.body.lastActivityAt
            ? new Date(props.body.lastActivityAt)
            : now,
          created_at: now,
          updated_at: now,
        },
        ...DiscussionBoardSectionStatisticTransformer.select(),
      });
  }
  return await DiscussionBoardSectionStatisticTransformer.transform(
    updatedStatistic,
  );
}
