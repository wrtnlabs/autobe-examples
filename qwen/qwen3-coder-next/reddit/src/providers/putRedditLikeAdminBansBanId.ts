import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeBan";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditLikeBanTransformer } from "../transformers/RedditLikeBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditLikeAdminBansBanId(props: {
  admin: AdminPayload;
  banId: string;
  body: IRedditLikeBan.IUpdate;
}): Promise<IRedditLikeBan> {
  const ban = await MyGlobal.prisma.reddit_like_bans.findUniqueOrThrow({
    where: { id: props.banId },
    ...RedditLikeBanTransformer.select(),
  });
  // Admins have platform-wide access to update any ban
  // No need to check moderator role since admin already has elevated permissions
  const updated = await MyGlobal.prisma.reddit_like_bans.update({
    where: { id: props.banId },
    data: {
      status: props.body.status,
      updated_at: toISOStringSafe(new Date()),
    },
    ...RedditLikeBanTransformer.select(),
  });
  return await RedditLikeBanTransformer.transform(updated);
}
