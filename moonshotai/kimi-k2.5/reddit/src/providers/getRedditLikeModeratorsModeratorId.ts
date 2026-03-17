import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
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
      where: {
        id: props.moderatorId,
        deleted_at: null,
      },
      ...RedditLikeModeratorTransformer.select(),
    });
  return await RedditLikeModeratorTransformer.transform(moderator);
}
