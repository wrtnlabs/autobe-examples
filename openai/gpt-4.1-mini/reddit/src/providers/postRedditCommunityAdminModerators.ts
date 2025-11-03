import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postRedditCommunityAdminModerators(props: {
  admin: AdminPayload;
  body: IRedditCommunityModerator.ICreate;
}): Promise<IRedditCommunityModerator> {
  // Verify user existence or throw 404
  const user = await MyGlobal.prisma.reddit_community_user.findUnique({
    where: { id: props.body.user_id },
  });
  if (user === null) {
    throw new HttpException("User not found", 404);
  }

  const newId = v4() as string & tags.Format<"uuid">;
  const createdAt = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.reddit_community_moderator.create({
    data: {
      id: newId,
      user_id: props.body.user_id,
      created_at: createdAt,
    } satisfies Prisma.reddit_community_moderatorCreateInput,
  });

  return {
    id: created.id,
    user_id: created.user_id,
    created_at: createdAt,
  };
}
