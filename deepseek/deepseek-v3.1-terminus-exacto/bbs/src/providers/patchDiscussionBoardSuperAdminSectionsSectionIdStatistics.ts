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

export async function patchDiscussionBoardSuperAdminSectionsSectionIdStatistics(props: {
  superAdmin: SuperAdminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionStatistic.IUpdate;
}): Promise<IDiscussionBoardSectionStatistic> {
  // 1. Verify the section exists and is active
  const section =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: {
        id: props.sectionId,
        // Check for active section (not deleted)
        // Assuming active section has deleted_at = null
        deleted_at: null,
      },
    });
  // 2. Prepare update data mapping from request body (camelCase) to database fields (snake_case)
  const updateData: any = {
    updated_at: new Date(),
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
    // Convert ISO string to Date for Prisma storage
    updateData.last_activity_at = new Date(props.body.lastActivityAt);
  }
  // 3. Upsert the statistics record (update if exists, create if not)
  const statistics =
    await MyGlobal.prisma.discussion_board_section_statistics.upsert({
      where: {
        discussion_board_section_id: props.sectionId,
      },
      update: updateData,
      create: {
        id: v4(),
        discussion_board_section_id: props.sectionId,
        view_count: props.body.viewCount ?? 0,
        article_count: props.body.articleCount ?? 0,
        comment_count: props.body.commentCount ?? 0,
        last_activity_at: props.body.lastActivityAt
          ? new Date(props.body.lastActivityAt)
          : new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      },
      // Select with transformer for consistent response format
      ...DiscussionBoardSectionStatisticTransformer.select(),
    });
  // 4. Transform and return using the transformer
  return await DiscussionBoardSectionStatisticTransformer.transform(statistics);
}
