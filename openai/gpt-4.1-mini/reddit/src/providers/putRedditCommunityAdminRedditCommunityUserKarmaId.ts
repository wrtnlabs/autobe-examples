import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putRedditCommunityAdminRedditCommunityUserKarmaId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IRedditCommunityUserKarma.IUpdate;
}): Promise<IRedditCommunityUserKarma> {
  const existing = await MyGlobal.prisma.reddit_community_user_karma.findUnique(
    {
      where: { id: props.id },
    },
  );

  if (!existing) {
    throw new HttpException("User karma record not found", 404);
  }

  const updated = await MyGlobal.prisma.reddit_community_user_karma.update({
    where: { id: props.id },
    data: {
      ...(props.body.karma !== undefined && { karma: props.body.karma }),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    registered_user_id: updated.registered_user_id,
    karma: updated.karma,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
