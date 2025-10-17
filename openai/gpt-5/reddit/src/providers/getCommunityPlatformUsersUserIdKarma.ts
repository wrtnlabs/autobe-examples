import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserKarma";

export async function getCommunityPlatformUsersUserIdKarma(props: {
  userId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformUserKarma> {
  const user = await MyGlobal.prisma.community_platform_users.findUnique({
    where: { id: props.userId },
    select: { id: true },
  });
  if (!user) throw new HttpException("Not Found", 404);

  const karma = await MyGlobal.prisma.community_platform_user_karmas.findFirst({
    where: {
      community_platform_user_id: props.userId,
      deleted_at: null,
    },
    select: {
      post_karma: true,
      comment_karma: true,
      total_karma: true,
    },
  });

  if (!karma) {
    return {
      post_karma: 0,
      comment_karma: 0,
      total_karma: 0,
    };
  }

  return {
    post_karma: karma.post_karma,
    comment_karma: karma.comment_karma,
    total_karma: karma.total_karma,
  };
}
