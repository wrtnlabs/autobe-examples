import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postDiscussionBoardModeratorTags(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardTag.ICreate;
}): Promise<IDiscussionBoardTag> {
  const { moderator, body } = props;

  // Normalize tag name to lowercase for consistency
  const normalizedName = body.name.toLowerCase();

  // Prepare timestamp once
  const now = toISOStringSafe(new Date());

  // Create tag with status "pending_review" for moderator-created tags
  const created = await MyGlobal.prisma.discussion_board_tags.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      name: normalizedName,
      description: body.description ?? null,
      status: "pending_review",
      created_at: now,
      updated_at: now,
    },
  });

  // Return formatted response matching IDiscussionBoardTag interface
  return {
    id: created.id as string & tags.Format<"uuid">,
    name: created.name,
    description: created.description === null ? undefined : created.description,
    status: created.status,
    created_at: now,
    updated_at: now,
  };
}
