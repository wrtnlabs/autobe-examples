import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBBSPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSPost";
import { ICommunityBBSCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizen";
import { ICommunityBBSCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCommunity";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function postCommunityBBSCitizenPosts(props: {
  citizen: CitizenPayload;
  body: ICommunityBBSPost.ICreate;
}): Promise<ICommunityBBSPost> {
  // Parse body as JSON assuming it's a string containing the ICreate payload
  const bodyData =
    typeof props.body === "string" ? JSON.parse(props.body) : props.body;

  // Find the target community by ID
  const community = await MyGlobal.prisma.community_bbs_communities.findUnique({
    where: {
      id: bodyData.community_id,
      deleted_at: null,
      status: "active",
    },
  });

  // Validate community exists and is active
  if (!community) {
    throw new HttpException("Community not found or not active", 404);
  }

  // Find the citizen details
  const citizen = await MyGlobal.prisma.community_bbs_citizen.findUnique({
    where: {
      id: props.citizen.id,
      deleted_at: null,
    },
  });

  if (!citizen) {
    throw new HttpException("Citizen not found", 404);
  }

  // Create the post with inline Prisma data and precise date handling
  const created = await MyGlobal.prisma.community_bbs_posts.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      title: bodyData.title,
      body: bodyData.body,
      status: "pending",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      community_id: bodyData.community_id,
      citizen_id: props.citizen.id,
    },
  });

  // Return fully typed response matching ICommunityBBSPost
  return {
    id: created.id,
    title: created.title,
    body: created.body || undefined,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: created.updated_at
      ? toISOStringSafe(created.updated_at)
      : undefined,
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
    author: {
      id: citizen.id,
      username: citizen.username,
      nickname: citizen.nickname ?? null,
    },
    community: community.id,
  };
}
