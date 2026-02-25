import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMember";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PlatformadminPayload } from "../decorators/payload/PlatformadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityPlatformAdminUsers(props: {
  platformAdmin: PlatformadminPayload;
  body: IRedditCommunityMember.IRequest;
}): Promise<IPageIRedditCommunityMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const where: Prisma.reddit_community_membersWhereInput = {
    is_deleted: false,
    ...(props.body.search && {
      OR: [
        { username: { contains: props.body.search, mode: "insensitive" } },
        { display_name: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.karma_min !== undefined && {
      karma_score: { gte: props.body.karma_min },
    }),
    ...(props.body.karma_max !== undefined && {
      karma_score: { lte: props.body.karma_max },
    }),
  };
  const orderBy: Prisma.reddit_community_membersOrderByWithRelationInput =
    props.body.sort === "username"
      ? { username: "asc" }
      : props.body.sort === "karma"
        ? { karma_score: "desc" }
        : { created_at: "desc" };
  const data = await MyGlobal.prisma.reddit_community_members.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      username: true,
      display_name: true,
      bio: true,
      avatar_url: true,
      karma_score: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.reddit_community_members.count({ where });
  const mappedData = await ArrayUtil.asyncMap(data, (member) =>
    typia.assert<IRedditCommunityMember.ISummary>({
      id: member.id,
      username: member.username,
      display_name: member.display_name,
      bio: member.bio ?? undefined,
      avatar_url: member.avatar_url ?? undefined,
      karma_score: member.karma_score,
      created_at: member.created_at.toISOString() as string &
        tags.Format<"date-time">,
    }),
  );
  return typia.assert<IPageIRedditCommunityMember.ISummary>({
    data: mappedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  });
}
