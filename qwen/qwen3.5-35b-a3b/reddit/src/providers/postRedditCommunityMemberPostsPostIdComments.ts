import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityCommentCollector } from "../collectors/RedditCommunityCommentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityCommentTransformer } from "../transformers/RedditCommunityCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityMemberPostsPostIdComments(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityComment.ICreate;
}): Promise<IRedditCommunityComment> {
  const postWithCommunity =
    await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
      where: { id: props.postId, deleted_at: null },
      select: { community_id: true },
    });
  const ban = await MyGlobal.prisma.reddit_community_bans.findFirst({
    where: {
      reddit_community_member_id: props.member.id,
      reddit_community_id: postWithCommunity.community_id,
      deleted_at: null,
    },
  });
  if (ban !== null) {
    throw new HttpException("Forbidden", 403);
  }
  const created = await MyGlobal.prisma.reddit_community_comments.create({
    data: await RedditCommunityCommentCollector.collect({
      body: props.body,
      redditCommunityMembers: {
        id: props.member.id,
      } satisfies IEntity,
      redditCommunityPosts: {
        id: props.postId,
      } satisfies IEntity,
    }),
    ...RedditCommunityCommentTransformer.select(),
  });
  return await RedditCommunityCommentTransformer.transform(created);
}
