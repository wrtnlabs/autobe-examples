import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
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
  // Validate that the post exists and is not deleted
  await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
  });
  // If parent_comment_id is provided, validate parent comment exists and is not deleted
  if (
    props.body.parent_comment_id !== undefined &&
    props.body.parent_comment_id !== null
  ) {
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: {
        id: props.body.parent_comment_id,
        deleted_at: null,
      },
    });
  }
  // Create the comment using the collector
  const created = await MyGlobal.prisma.reddit_community_comments.create({
    data: await RedditCommunityCommentCollector.collect({
      body: props.body,
      redditCommunityMembers: { id: props.member.id },
      redditCommunityPosts: { id: props.postId },
    }),
    ...RedditCommunityCommentTransformer.select(),
  });
  // Transform and return the complete comment entity
  return await RedditCommunityCommentTransformer.transform(created);
}
