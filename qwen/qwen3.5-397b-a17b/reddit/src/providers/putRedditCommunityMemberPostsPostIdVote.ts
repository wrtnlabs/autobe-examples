import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityPostVoteTransformer } from "../transformers/RedditCommunityPostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCommunityMemberPostsPostIdVote(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityPostVote.IUpdate;
}): Promise<IRedditCommunityPostVote> {
  await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });
  const existingVote =
    await MyGlobal.prisma.reddit_community_post_votes.findUnique({
      where: {
        reddit_community_member_id_reddit_community_post_id: {
          reddit_community_member_id: props.member.id,
          reddit_community_post_id: props.postId,
        },
      },
    });
  if (existingVote !== null) {
    if (props.body.direction === null || props.body.direction === undefined) {
      await MyGlobal.prisma.reddit_community_post_votes.update({
        where: { id: existingVote.id },
        data: {
          deleted_at: new Date(),
        },
      });
    } else {
      await MyGlobal.prisma.reddit_community_post_votes.update({
        where: { id: existingVote.id },
        data: {
          direction: props.body.direction,
          updated_at: new Date(),
        },
      });
    }
  } else if (
    props.body.direction !== null &&
    props.body.direction !== undefined
  ) {
    await MyGlobal.prisma.reddit_community_post_votes.create({
      data: {
        id: v4(),
        reddit_community_member_id: props.member.id,
        reddit_community_post_id: props.postId,
        direction: props.body.direction,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
  }
  const vote =
    await MyGlobal.prisma.reddit_community_post_votes.findUniqueOrThrow({
      where: {
        reddit_community_member_id_reddit_community_post_id: {
          reddit_community_member_id: props.member.id,
          reddit_community_post_id: props.postId,
        },
      },
      ...RedditCommunityPostVoteTransformer.select(),
    });
  return await RedditCommunityPostVoteTransformer.transform(vote);
}
