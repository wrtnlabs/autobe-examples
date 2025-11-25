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

export async function postCommunityBBSCitizenComments(props: {
  citizen: CitizenPayload;
  body: ICommunityBBSComment.ICreate;
}): Promise<ICommunityBBSComment> {
  // Validate post exists and is not deleted
  const post = await MyGlobal.prisma.community_bbs_posts.findUnique({
    where: {
      id: props.body.post_id,
      deleted_at: null,
    },
    include: {
      citizen: true,
      community: true,
    },
  });

  if (!post) {
    throw new HttpException("Target post not found or deleted", 404);
  }

  // Fetch citizen summary for response
  const citizen = await MyGlobal.prisma.community_bbs_citizen.findUnique({
    where: {
      id: props.citizen.id,
      deleted_at: null,
    },
    select: {
      username: true,
      nickname: true,
    },
  });

  if (!citizen) {
    throw new HttpException("Authenticated citizen not found", 404);
  }

  // Create new comment - Explicitly generate and include id since Prisma type requires it
  const created = await MyGlobal.prisma.community_bbs_comments.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      post_id: props.body.post_id,
      citizen_id: props.citizen.id,
      body: props.body.body,
      business_status: typia.assert<
        "pending_review" | "approved" | "rejected" | "hidden"
      >("pending_review"),
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return full comment with populated references
  return {
    id: created.id,
    post_id: created.post_id,
    citizen_id: created.citizen_id,
    body: created.body,
    business_status: typia.assert<
      "pending_review" | "approved" | "rejected" | "hidden"
    >(created.business_status),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null ? toISOStringSafe(created.deleted_at) : null,
    post: {
      id: post.id,
      title: post.title,
      created_at: toISOStringSafe(post.created_at),
      status: post.status,
      author: {
        id: post.citizen.id,
        username: post.citizen.username,
        nickname: post.citizen.nickname,
      },
      community: post.community.id, // Direct string assignment matching ICommunityBBSCommunity.ISummary
    },
    citizen: {
      id: props.citizen.id,
      username: citizen.username,
      nickname: citizen.nickname,
    },
  };
}
