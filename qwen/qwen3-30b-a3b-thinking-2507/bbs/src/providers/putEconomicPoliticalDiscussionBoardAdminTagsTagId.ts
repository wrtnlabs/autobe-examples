import { IEconomicPoliticalDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EconomicPoliticalDiscussionBoardTagTransformer } from "../transformers/EconomicPoliticalDiscussionBoardTagTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEconomicPoliticalDiscussionBoardAdminTagsTagId(props: {
  admin: AdminPayload;
  tagId: string;
  body: IEconomicPoliticalDiscussionBoardTag.IUpdate;
}): Promise<IEconomicPoliticalDiscussionBoardTag> {
  // Find existing tag (must exist and not soft-deleted)
  const tag =
    await MyGlobal.prisma.economic_political_discussion_board_tags.findUniqueOrThrow(
      {
        where: { id: props.tagId },
        select: { id: true, name: true, deleted_at: true },
      },
    );
  if (tag.deleted_at !== null) {
    throw new HttpException("Tag not found", 404);
  }
  // Check for duplicate name (excluding current tag)
  const existingTag =
    await MyGlobal.prisma.economic_political_discussion_board_tags.findFirst({
      where: {
        name: props.body.name,
        id: { not: props.tagId },
        deleted_at: null,
      },
    });
  if (existingTag) {
    throw new HttpException("Tag name already exists", 409);
  }
  // Update with new name and current timestamp
  await MyGlobal.prisma.economic_political_discussion_board_tags.update({
    where: { id: props.tagId },
    data: {
      name: props.body.name,
      updated_at: new Date().toISOString(),
    },
  });
  // Format response using transformer
  const updatedTag =
    await MyGlobal.prisma.economic_political_discussion_board_tags.findUniqueOrThrow(
      {
        where: { id: props.tagId },
        ...EconomicPoliticalDiscussionBoardTagTransformer.select(),
      },
    );
  return await EconomicPoliticalDiscussionBoardTagTransformer.transform(
    updatedTag,
  );
}
