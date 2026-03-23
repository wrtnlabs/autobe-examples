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
import { RedditLikeBanCollector } from "../collectors/RedditLikeBanCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditLikeBanTransformer } from "../transformers/RedditLikeBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeAdminCommunitiesCommunityIdBans(props: {
  admin: AdminPayload;
  communityId: string;
  body: IRedditLikeBan.ICreate;
}): Promise<IRedditLikeBan> {
  // Verify community exists
  await MyGlobal.prisma.reddit_like_communities.findUniqueOrThrow({
    where: { id: props.communityId },
  });
  // Create ban record
  const ban = await MyGlobal.prisma.reddit_like_bans.create({
    data: await RedditLikeBanCollector.collect({ body: props.body }),
    ...RedditLikeBanTransformer.select(),
  });
  return await RedditLikeBanTransformer.transform(ban);
}
