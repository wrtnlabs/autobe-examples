import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeBan";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeBanCollector } from "../collectors/RedditLikeBanCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeBanTransformer } from "../transformers/RedditLikeBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeMemberCommunitiesCommunityNameBanUsername(props: {
  member: MemberPayload;
  communityName: string;
  username: string;
  body: IRedditLikeBan.ICreate;
}): Promise<IRedditLikeBan> {
  const user = await MyGlobal.prisma.reddit_like_members.findFirst({
    where: { username: props.username, deleted_at: null },
    select: { id: true },
  });
  if (!user) throw new HttpException("User not found", 404);
  const community = await MyGlobal.prisma.reddit_like_communities.findFirst({
    where: { name: props.communityName, deleted_at: null },
    select: { id: true },
  });
  if (!community) throw new HttpException("Community not found", 404);
  const ban = await MyGlobal.prisma.reddit_like_bans.create({
    data: await RedditLikeBanCollector.collect({
      body: { ...props.body, status: "active" },
    }),
    ...RedditLikeBanTransformer.select(),
  });
  return await RedditLikeBanTransformer.transform(ban);
}
