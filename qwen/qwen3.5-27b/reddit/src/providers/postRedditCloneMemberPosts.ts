import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditClonePostCollector } from "../collectors/RedditClonePostCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditClonePostTransformer } from "../transformers/RedditClonePostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberPosts(props: {
  member: MemberPayload;
  body: IRedditClonePost.ICreate;
}): Promise<IRedditClonePost> {
  // Check if member is banned from the community
  const activeBan = await MyGlobal.prisma.reddit_clone_bans.findFirst({
    where: {
      community_id: props.body.communityId,
      member_id: props.member.id,
      lifted_at: null,
      deleted_at: null,
    },
  });
  if (activeBan !== null) {
    throw new HttpException("You are banned from this community", 403);
  }
  // Create the post using collector and transformer
  const created = await MyGlobal.prisma.reddit_clone_posts.create({
    data: await RedditClonePostCollector.collect({
      body: props.body,
      redditCloneMembers: {
        id: props.member.id,
      },
    }),
    ...RedditClonePostTransformer.select(),
  });
  return await RedditClonePostTransformer.transform(created);
}
