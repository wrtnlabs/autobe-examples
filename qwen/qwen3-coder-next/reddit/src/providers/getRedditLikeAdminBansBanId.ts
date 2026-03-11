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

export async function getRedditLikeAdminBansBanId(props: {
  admin: AdminPayload;
  banId: string;
}): Promise<IRedditLikeBan> {
  // Verify admin authorization first
  await adminAuthorize({ headers: { authorization: props.admin.session_id } });
  const ban = await MyGlobal.prisma.reddit_like_bans.findUniqueOrThrow({
    where: { id: props.banId },
    ...RedditLikeBanTransformer.select(),
  });
  // Admins can access any ban, no additional community ownership check needed
  return await RedditLikeBanTransformer.transform(ban);
}
