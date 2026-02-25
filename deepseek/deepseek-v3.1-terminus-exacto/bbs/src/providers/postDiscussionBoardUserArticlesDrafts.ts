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
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardArticleDraftTransformer } from "../transformers/DiscussionBoardArticleDraftTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardUserArticlesDrafts(props: {
  user: UserPayload;
  body: IDiscussionBoardArticleDraft.ICreate;
}): Promise<IDiscussionBoardArticleDraft> {
  // Validate draft title length requirement (5-200 characters)
  if (props.body.draft_title.trim().length < 5) {
    throw new HttpException(
      "Draft title must be at least 5 characters long",
      400,
    );
  }
  if (props.body.draft_title.length > 200) {
    throw new HttpException("Draft title cannot exceed 200 characters", 400);
  }
  // Validate draft content is not empty
  if (props.body.draft_content.trim().length === 0) {
    throw new HttpException("Draft content cannot be empty", 400);
  }
  // Validate draft_status is 'draft' for new creations
  if (props.body.draft_status && props.body.draft_status !== "draft") {
    throw new HttpException('New drafts must have status set to "draft"', 400);
  }
  // Validate recovery_data JSON structure if provided
  if (
    props.body.recovery_data !== undefined &&
    props.body.recovery_data !== null
  ) {
    try {
      if (typeof props.body.recovery_data === "string") {
        JSON.parse(props.body.recovery_data);
      } else if (typeof props.body.recovery_data === "object") {
        JSON.stringify(props.body.recovery_data);
      } else {
        throw new HttpException("Recovery data must be valid JSON", 400);
      }
    } catch (error) {
      throw new HttpException("Invalid recovery data format", 400);
    }
  }
  const createData: IDiscussionBoardArticleDraft.ICreate = {
    draft_title: props.body.draft_title.trim(),
    draft_content: props.body.draft_content.trim(),
    draft_status: "draft",
    recovery_data: props.body.recovery_data
      ? typeof props.body.recovery_data === "string"
        ? (JSON.parse(props.body.recovery_data) satisfies Record<
            string,
            string
          > as Record<string, string>)
        : (props.body.recovery_data satisfies Record<string, string> as Record<
            string,
            string
          >)
      : null,
  };
  const created = await MyGlobal.prisma.discussion_board_article_drafts.create({
    data: await DiscussionBoardArticleDraftCollector.collect({
      body: createData,
    }),
    ...DiscussionBoardArticleDraftTransformer.select(),
  });
  return await DiscussionBoardArticleDraftTransformer.transform(created);
}
