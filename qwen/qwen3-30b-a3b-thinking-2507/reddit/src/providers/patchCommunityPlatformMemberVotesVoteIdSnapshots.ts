import { ICommunityPlatformVoteSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformVoteSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVoteSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberVotesVoteIdSnapshots(props: {
  member: MemberPayload;
  voteId: string & tags.Format<"uuid">;
  body: ICommunityPlatformVoteSnapshot.IRequest;
}): Promise<IPageICommunityPlatformVoteSnapshot.ISummary> {
  // Validate vote exists in votes table
  const vote = await MyGlobal.prisma.community_platform_votes.findUnique({
    where: { id: props.voteId },
    select: { id: true },
  });
  if (!vote) {
    throw new HttpException("Vote not found", 404);
  }
  // Calculate pagination parameters
  const page = props.body.page ?? 1;
  const size = props.body.size ?? 25;
  // Configure sorting
  const sortField = props.body.sort ?? "created_at";
  const sortOrder = (props.body.order === "asc" ? "asc" : "desc") as
    | "asc"
    | "desc";
  // Validate sorting fields to prevent injection/invalid fields
  const validSortFields = ["created_at"];
  if (!validSortFields.includes(sortField)) {
    throw new HttpException("Invalid sort field", 400);
  }
  // Calculate pagination offsets
  const skip = (page - 1) * size;
  // Query snapshot records with pagination and soft deletion check
  const snapshotData =
    await MyGlobal.prisma.community_platform_vote_snapshots.findMany({
      where: {
        community_platform_vote_id: props.voteId,
        deleted_at: null,
      },
      skip,
      take: size,
      orderBy: {
        [sortField]: sortOrder,
      },
    });
  // Count total records for pagination metadata
  const total = await MyGlobal.prisma.community_platform_vote_snapshots.count({
    where: {
      community_platform_vote_id: props.voteId,
      deleted_at: null,
    },
  });
  // Transform records to response format
  const transformedSnapshots = snapshotData.map((snap) => ({
    id: snap.id,
    created_at: toISOStringSafe(snap.created_at),
    updated_at: toISOStringSafe(snap.updated_at),
    // Other fields will be populated from transformer if needed, but for now we use minimal structure
  }));
  return {
    data: transformedSnapshots,
    pagination: {
      current: page,
      limit: size,
      records: total,
      pages: Math.ceil(total / size),
    },
  };
}
