import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVote";
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

export async function patchCommunityPlatformMemberVotes(props: {
  member: MemberPayload;
  body: ICommunityPlatformVote.IRequest;
}): Promise<IPageICommunityPlatformVote.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.community_platform_votesWhereInput = {
    user_id: props.member.id,
    deleted_at: null,
  };
  if (props.body.votable_type) {
    whereInput.votable_type = props.body.votable_type as "post" | "comment";
  }
  if (props.body.votable_id) {
    whereInput.votable_id = props.body.votable_id;
  }
  if (props.body.vote_type) {
    whereInput.vote_type = props.body.vote_type as "up" | "down";
  }
  const data = await MyGlobal.prisma.community_platform_votes.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: {
      created_at: props.body.sortDirection === "asc" ? "asc" : "desc",
    },
    select: {
      id: true,
      votable_type: true,
      votable_id: true,
      vote_type: true,
      created_at: true,
      updated_at: true,
      user: {
        select: {},
      },
    },
  });
  const total = await MyGlobal.prisma.community_platform_votes.count({
    where: whereInput,
  });
  const transformedData = data.map((vote) => ({
    id: vote.id,
    votable_type: typia.assert<"post" | "comment">(vote.votable_type),
    votable_id: vote.votable_id,
    vote_type: typia.assert<"up" | "down">(vote.vote_type),
    created_at: toISOStringSafe(vote.created_at),
    updated_at: toISOStringSafe(vote.updated_at),
    user: {} as ICommunityPlatformMember.ISummary,
  }));
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
