import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { DiscussionBoardArticleTagTransformer } from "../transformers/DiscussionBoardArticleTagTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdministratorTags(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardArticleTag.ICreate;
}): Promise<IDiscussionBoardArticleTag> {
  const existing = await MyGlobal.prisma.discussion_board_tags.findFirst({
    where: { name: props.body.name, deleted_at: null },
    select: { id: true },
  });
  if (existing !== null) {
    throw new HttpException(
      `Tag with name '${props.body.name}' already exists`,
      409,
    );
  }
  const nowDate = new Date();
  const id = v4();
  const createdRaw = await MyGlobal.prisma.discussion_board_tags.create({
    data: {
      id,
      name: props.body.name,
      created_at: nowDate,
      updated_at: nowDate,
      deleted_at: null,
    },
  });
  // Pass raw created entity retaining Date types to transformer
  const created = {
    id: createdRaw.id as string & tags.Format<"uuid">,
    name: createdRaw.name,
    created_at: createdRaw.created_at,
    updated_at: createdRaw.updated_at,
    deleted_at: null,
    articleTagMappings: [],
    mvTagUsageStats: [],
    articleTags: [],
  };
  return await DiscussionBoardArticleTagTransformer.transform(created);
}
