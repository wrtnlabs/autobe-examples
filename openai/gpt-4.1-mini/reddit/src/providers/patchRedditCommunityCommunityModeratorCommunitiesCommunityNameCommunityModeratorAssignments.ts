import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModeratorAssignment";
import { IPageIRedditCommunityCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityModeratorAssignment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";

export async function patchRedditCommunityCommunityModeratorCommunitiesCommunityNameCommunityModeratorAssignments(props: {
  communityModerator: CommunitymoderatorPayload;
  communityName: string;
  body: IRedditCommunityCommunityModeratorAssignment.IRequest;
}): Promise<IPageIRedditCommunityCommunityModeratorAssignment> {
  const page = props.body.page > 0 ? props.body.page : 1;
  const limit = props.body.limit > 0 ? props.body.limit : 100;
  const skip = (page - 1) * limit;

  const whereCondition: any = {
    community_name: props.communityName,
  };

  if (
    typeof props.body.search === "string" &&
    props.body.search.trim() !== ""
  ) {
    // Search for roles containing the search string case-insensitive
    whereCondition.role = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }

  let orderBy: object | undefined = undefined;

  if (typeof props.body.sortBy === "string" && props.body.sortBy.length > 0) {
    const order = props.body.sortOrder === "desc" ? "desc" : "asc";
    orderBy = {
      [props.body.sortBy]: order,
    };
  }

  const [records, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_community_moderator_assignments.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.reddit_community_community_moderator_assignments.count({
      where: whereCondition,
    }),
  ]);

  return {
    data: records.map((record) => ({
      id: record.id,
      community_moderator_id: record.community_moderator_id,
      community_name: props.communityName,
      role: "",
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
    })),
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
