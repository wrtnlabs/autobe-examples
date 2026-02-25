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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardSectionStatisticTransformer } from "../transformers/DiscussionBoardSectionStatisticTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminSectionsSectionIdStatistics(props: {
  superAdmin: SuperAdminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionStatistic.IUpdate;
}): Promise<IDiscussionBoardSectionStatistic> {
  // Verify section exists
  await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
    where: { id: props.sectionId },
  });
  // Get current timestamp for updates
  const now = new Date();
  // Build update data with proper conditional updates
  const data: Record<string, unknown> = {
    updated_at: now,
  };
  // Handle viewCount update with snake_case field name
  if (props.body.viewCount !== undefined) {
    data.view_count = props.body.viewCount;
  }
  // Handle articleCount update with snake_case field name
  if (props.body.articleCount !== undefined) {
    data.article_count = props.body.articleCount;
  }
  // Handle commentCount update with snake_case field name
  if (props.body.commentCount !== undefined) {
    data.comment_count = props.body.commentCount;
  }
  // Handle lastActivityAt - convert string to Date object
  if (props.body.lastActivityAt !== undefined) {
    data.last_activity_at = new Date(props.body.lastActivityAt);
  }
  // Use upsert to handle both create and update scenarios
  const updatedStats =
    await MyGlobal.prisma.discussion_board_section_statistics.upsert({
      where: { discussion_board_section_id: props.sectionId },
      update: data,
      create: {
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
  return await DiscussionBoardSectionStatisticTransformer.transform(
    updatedStats,
  );
}
