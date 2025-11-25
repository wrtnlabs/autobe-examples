import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBBSPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSPostVote";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function postCommunityBBSCitizenPostsPostIdVotes(props: {
  citizen: CitizenPayload;
  postId: string;
  body: ICommunityBBSPostVote.ICreate;
}): Promise<ICommunityBBSPostVote> {
  // Verify post exists and is not soft-deleted
  const post = await MyGlobal.prisma.community_bbs_posts.findUnique({
    where: {
      id: props.postId,
      deleted_at: null,
    },
  });

  if (!post) {
    throw new HttpException("Post not found or has been deleted", 404);
  }

  // Check if citizen already voted on this post
  const existingVote =
    await MyGlobal.prisma.community_bbs_post_votes.findUnique({
      where: {
        community_bbs_post_id_community_bbs_citizen_id: {
          community_bbs_post_id: props.postId,
          community_bbs_citizen_id: props.citizen.id,
        },
      },
    });

  // If vote exists and type matches - revoke (delete) the vote
  if (existingVote && existingVote.type === props.body.type) {
    await MyGlobal.prisma.community_bbs_post_votes.delete({
      where: {
        id: existingVote.id,
      },
    });
    return existingVote.type; // Return the vote type as string per ICommunityBBSPostVote
  }

  // If vote exists and type differs - update the vote
  if (existingVote) {
    await MyGlobal.prisma.community_bbs_post_votes.update({
      where: {
        id: existingVote.id,
      },
      data: {
        type: props.body.type,
        updated_at: toISOStringSafe(new Date()),
        deleted_at: null, // Ensure vote is active
      },
    });
    return props.body.type; // Return the new vote type per ICommunityBBSPostVote
  }

  // If no vote exists - create new vote
  await MyGlobal.prisma.community_bbs_post_votes.create({
    data: {
      id: v4(),
      community_bbs_post_id: props.postId,
      community_bbs_citizen_id: props.citizen.id,
      type: props.body.type,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return props.body.type; // Return the new vote type per ICommunityBBSPostVote
}
