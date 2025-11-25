import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putRedditCommunityAdminRedditCommunityModeratorsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IRedditCommunityModerator.IUpdate;
}): Promise<IRedditCommunityModerator> {
  const existing = await MyGlobal.prisma.reddit_community_moderators.findUnique(
    {
      where: { id: props.id },
    },
  );

  if (!existing) throw new HttpException("Moderator not found", 404);

  const updated = await MyGlobal.prisma.reddit_community_moderators.update({
    where: { id: props.id },
    data: {
      ...(props.body.email !== undefined && { email: props.body.email }),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : null,
  };
}
