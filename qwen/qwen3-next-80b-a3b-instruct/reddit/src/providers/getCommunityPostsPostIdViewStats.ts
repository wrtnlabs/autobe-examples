import { ICommunityPostViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostViewStat";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPostsPostIdViewStats(props: {
  postId: string;
}): Promise<ICommunityPostViewStat> {
  const viewStat = await MyGlobal.prisma.community_post_view_stats.findUnique({
    where: {
      community_post_id: props.postId,
      deleted_at: null,
    },
  });
  if (!viewStat) {
    throw new HttpException("View statistics not found", 404);
  }
  return {};
}
