import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeModeratorTransformer } from "../transformers/RedditLikeModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeModeratorsModeratorId(props: {
  moderatorId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeModerator> {
  const moderator =
    await MyGlobal.prisma.reddit_like_moderators.findUniqueOrThrow({
      where: { id: props.moderatorId },
      ...RedditLikeModeratorTransformer.select(),
    });
  return await RedditLikeModeratorTransformer.transform(moderator);
}
