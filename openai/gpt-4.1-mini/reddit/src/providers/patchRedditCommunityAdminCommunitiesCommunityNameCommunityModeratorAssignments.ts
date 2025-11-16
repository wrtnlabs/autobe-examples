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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditCommunityAdminCommunitiesCommunityNameCommunityModeratorAssignments(props: {
  admin: AdminPayload;
  communityName: string;
  body: IRedditCommunityCommunityModeratorAssignment.IRequest;
}): Promise<IPageIRedditCommunityCommunityModeratorAssignment> {
  const page = props.body.page > 0 ? props.body.page : 1;
  const limit = props.body.limit > 0 ? props.body.limit : 20;
  const skip = (page - 1) * limit;

  const whereCondition: Prisma.reddit_community_community_moderator_assignmentsWhereInput =
    {
      community_id: props.communityName,
      ...(props.body.search
        ? {
            OR: [{ community_moderator_id: { equals: props.body.search } }],
          }
        : {}),
    };

  const orderByCondition: Prisma.reddit_community_community_moderator_assignmentsOrderByWithRelationInput =
    props.body.sortBy
      ? {
          [props.body.sortBy]: props.body.sortOrder === "desc" ? "desc" : "asc",
        }
      : { created_at: "desc" };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_community_moderator_assignments.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: orderByCondition,
    }),
    MyGlobal.prisma.reddit_community_community_moderator_assignments.count({
      where: whereCondition,
    }),
  ]);

  return {
    data: data.map((record) => ({
      id: record.id,
      community_moderator_id: record.community_moderator_id,
      community_name: props.communityName,
      role: "",
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
    })),
    pagination: {
      current: page satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: limit satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: total,
      pages: Math.ceil(total / limit) satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
  };
}
