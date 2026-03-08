import { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformVoteTransformer } from "../transformers/CommunityPlatformVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberPostsPostIdVote(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformVote | null> {
  // Verify the post exists
  await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true },
  });
  // Find the member's vote on this post (may be null)
  const vote = await MyGlobal.prisma.community_platform_votes.findUnique({
    where: {
      post_id_member_id: {
        post_id: props.postId,
        member_id: props.member.id,
      },
    },
    ...CommunityPlatformVoteTransformer.select(),
  });
  if (vote === null) {
    return null;
  }
  return await CommunityPlatformVoteTransformer.transform(vote);
}
