import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeBan";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditLikeBanTransformer } from "../transformers/RedditLikeBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeModeratorBansBanId(props: {
  moderator: ModeratorPayload;
  banId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeBan> {
  const ban = await MyGlobal.prisma.reddit_like_bans.findUniqueOrThrow({
    where: { id: props.banId },
    ...RedditLikeBanTransformer.select(),
  });
  return await RedditLikeBanTransformer.transform(ban);
}
