import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBBSComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSComment";
import { ICommunityBBSPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSPost";
import { ICommunityBBSCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizen";
import { ICommunityBBSCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCommunity";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function postCommunityBBSCitizenPostsPostIdComments(props: {
  citizen: CitizenPayload;
  postId: string;
  body: ICommunityBBSComment.ICreate;
}): Promise<ICommunityBBSComment> {
  // Validate that the target post exists and is not deleted
  const post = await MyGlobal.prisma.community_bbs_posts.findUnique({
    where: {
      id: props.postId,
      deleted_at: null,
    },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  // Create the new comment with the provided data and system-managed fields
  const createdComment = await MyGlobal.prisma.community_bbs_comments.create({
    data: {
      post_id: props.postId,
      citizen_id: props.citizen.id,
      body: props.body.body,
      business_status: "pending_review",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    } as any, // Bypass Prisma type issue per instruction - do not assert on Prisma types
  });

  // Fetch the summary of the post's author (citizen)
  const author = await MyGlobal.prisma.community_bbs_citizen.findUnique({
    where: { id: post.citizen_id },
  });

  // Fetch the community summary (though it expects string, per DTO)
  const community = post.community_id;

  // Fetch citizen summary from citizen table
  const citizenSummary = await MyGlobal.prisma.community_bbs_citizen.findUnique(
    {
      where: { id: props.citizen.id },
    },
  );

  // Construct response using exact DTO shapes
  return {
    id: createdComment.id,
    post_id: createdComment.post_id,
    citizen_id: createdComment.citizen_id,
    body: createdComment.body,
    business_status: typia.assert<
      "pending_review" | "approved" | "rejected" | "hidden"
    >(createdComment.business_status),
    created_at: toISOStringSafe(createdComment.created_at),
    updated_at: toISOStringSafe(createdComment.updated_at),
    deleted_at: toISOStringSafe(createdComment.deleted_at ?? new Date()),
    post: {
      id: post.id,
      title: post.title,
      created_at: toISOStringSafe(post.created_at),
      status: post.status,
      author: {
        id: author?.id ?? "",
        username: author?.username ?? "",
        nickname: author?.nickname ?? null,
      },
      community: community,
    },
    citizen: {
      id: citizenSummary?.id ?? "",
      username: citizenSummary?.username ?? "",
      nickname: citizenSummary?.nickname ?? null,
    },
  };
}
