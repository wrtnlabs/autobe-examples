import { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardArticleDraftCollector } from "../collectors/DiscussionBoardArticleDraftCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardArticleDraftTransformer } from "../transformers/DiscussionBoardArticleDraftTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminArticlesDrafts(props: {
  admin: AdminPayload;
  body: IDiscussionBoardArticleDraft.ICreate;
}): Promise<IDiscussionBoardArticleDraft> {
  // Validate draft title length and content
  const trimmedTitle = props.body.draft_title.trim();
  if (trimmedTitle.length < 5 || trimmedTitle.length > 200) {
    throw new HttpException(
      "Draft title must be between 5 and 200 characters after trimming whitespace",
      400,
    );
  }
  if (trimmedTitle.length !== props.body.draft_title.length) {
    throw new HttpException(
      "Draft title contains leading or trailing whitespace",
      400,
    );
  }
  // Validate draft status
  const allowedStatuses = ["draft", "published", "archived"];
  if (!allowedStatuses.includes(props.body.draft_status)) {
    throw new HttpException(
      `Draft status must be one of: ${allowedStatuses.join(", ")}`,
      400,
    );
  }
  // Validate draft content is not empty
  if (
    !props.body.draft_content ||
    props.body.draft_content.trim().length === 0
  ) {
    throw new HttpException("Draft content cannot be empty", 400);
  }
  // Validate recovery_data JSON format if provided
  if (
    props.body.recovery_data !== null &&
    props.body.recovery_data !== undefined
  ) {
    try {
      JSON.stringify(props.body.recovery_data);
    } catch {
      throw new HttpException("Recovery data must be valid JSON", 400);
    }
  }
  // Create the draft using collector
  const draft = await MyGlobal.prisma.discussion_board_article_drafts.create({
    data: await DiscussionBoardArticleDraftCollector.collect({
      body: props.body,
    }),
    ...DiscussionBoardArticleDraftTransformer.select(),
  });
  // Transform and return the response
  return await DiscussionBoardArticleDraftTransformer.transform(draft);
}
