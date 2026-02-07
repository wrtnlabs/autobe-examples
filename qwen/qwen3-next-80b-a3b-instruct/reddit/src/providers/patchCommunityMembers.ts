import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityMembers(props: {
  body: ICommunityMember.IRequest;
}): Promise<IPageICommunityMember.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Since IRequest is empty, no filtering or sorting options are allowed
  // Only active members (deleted_at IS NULL) are accessible
  const filters: Prisma.community_membersWhereInput = {
    deleted_at: null,
  };
  // Default sort: created_at DESC
  const orderBy: Prisma.community_membersOrderByWithRelationInput = {
    created_at: "desc",
  };
  // Count total records
  const total = await MyGlobal.prisma.community_members.count({
    where: filters,
  });
  // Fetch data
  const members = await MyGlobal.prisma.community_members.findMany({
    where: filters,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      display_name: true,
      email: true,
      is_email_verified: true,
      created_at: true,
      updated_at: true,
      karmaScoresForMember: {
        select: {
          karma_score: true,
        },
      },
    },
  });
  // Transform to summary format
  const data = members.map((member) => ({
    id: member.id as string & tags.Format<"uuid">,
    display_name: member.display_name,
    email: member.email,
    is_email_verified: member.is_email_verified,
    karma_score:
      member.karmaScoresForMember.length > 0
        ? member.karmaScoresForMember[0].karma_score
        : 0,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
  }));
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
