import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { DiscussionBoardTagTransformer } from "../transformers/DiscussionBoardTagTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdministratorTagsTagId(props: {
  administrator: AdministratorPayload;
  tagId: string & tags.Format<"uuid">;
  body: IDiscussionBoardTag.IUpdate;
}): Promise<IDiscussionBoardTag> {
  const updatedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const updated = await MyGlobal.prisma.discussion_board_tags.update({
    where: { id: props.tagId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      updated_at: updatedAt,
    },
    include: {
      articleTagMappings: true,
      mvTagUsageStats: true,
      articleTags: true,
    },
  });
  return await DiscussionBoardTagTransformer.transform(updated);
}
