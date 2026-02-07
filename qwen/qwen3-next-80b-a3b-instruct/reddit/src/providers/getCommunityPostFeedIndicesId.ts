import { ICommunityMvPostFeedIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMvPostFeedIndex";
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

export async function getCommunityPostFeedIndicesId(props: {
  id: string & tags.Format<"uuid">;
}): Promise<ICommunityMvPostFeedIndex> {
  const index = await MyGlobal.prisma.community_mv_post_feed_indices.findUnique(
    {
      where: { id: props.id },
      select: {
        id: true,
        post_id: true,
        feed_type: true,
        sort_algorithm: true,
        sort_order: true,
        last_updated: true,
      },
    },
  );
  if (!index) {
    throw new HttpException(
      "No post feed index found with the provided ID",
      404,
    );
  }
  return {
    id: index.id,
    post_id: index.post_id,
    feed_type: index.feed_type,
    sort_algorithm: index.sort_algorithm,
    sort_order: index.sort_order,
    last_updated: toISOStringSafe(index.last_updated),
  };
}
