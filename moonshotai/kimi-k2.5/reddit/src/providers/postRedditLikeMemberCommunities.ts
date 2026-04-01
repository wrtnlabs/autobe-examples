import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeCommunityCollector } from "../collectors/RedditLikeCommunityCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeCommunityTransformer } from "../transformers/RedditLikeCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeMemberCommunities(props: {
  member: MemberPayload;
  body: IRedditLikeCommunity.ICreate;
}): Promise<IRedditLikeCommunity> {
  const created = await MyGlobal.prisma.reddit_like_communities.create({
    data: await RedditLikeCommunityCollector.collect({
      body: props.body,
      redditLikeMembers: { id: props.member.id },
    }),
    ...RedditLikeCommunityTransformer.select(),
  });
  return await RedditLikeCommunityTransformer.transform(created);
}
