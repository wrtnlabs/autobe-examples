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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardArticleDraftTransformer } from "../transformers/DiscussionBoardArticleDraftTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminArticlesDrafts(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardArticleDraft.ICreate;
}): Promise<IDiscussionBoardArticleDraft> {
  // Validate draft title length (5-200 characters) based on requirements
  if (
    props.body.draft_title.length < 5 ||
    props.body.draft_title.length > 200
  ) {
    throw new HttpException(
      "Draft title must be between 5 and 200 characters",
      400,
    );
  }
  // Validate recovery_data JSON if provided
  if (
    props.body.recovery_data !== undefined &&
    props.body.recovery_data !== null
  ) {
    try {
      JSON.stringify(props.body.recovery_data);
    } catch {
      throw new HttpException("Invalid recovery_data JSON format", 400);
    }
  }
  // Ensure draft_status is 'draft' for new creations
  const validatedBody = {
    ...props.body,
    draft_status: "draft",
  };
  const created = await MyGlobal.prisma.discussion_board_article_drafts.create({
    data: await DiscussionBoardArticleDraftCollector.collect({
      body: validatedBody,
    }),
    ...DiscussionBoardArticleDraftTransformer.select(),
  });
  return await DiscussionBoardArticleDraftTransformer.transform(created);
}
