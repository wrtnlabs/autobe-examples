import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMember";
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

export async function patchCommunityPlatformMemberMembers(props: {
  member: MemberPayload;
  body: ICommunityPlatformMember.IRequest;
}): Promise<IPageICommunityPlatformMember.ISummary> {
  const page = (props.body.page ?? 1) satisfies number;
  const limit = (props.body.limit ?? 20) satisfies number;
  const skip = (page - 1) * limit;
  const search = props.body.search;
  const sortBy = props.body.sortBy ?? "createdAt";
  const sortOrder = (props.body.sortOrder ?? "desc") satisfies "asc" | "desc";
  const where = {
    deleted_at: null,
    ...(search
      ? {
          OR: [
            { email: { contains: search } },
            {
              userProfile: {
                display_name: { contains: search },
              },
            },
          ],
        }
      : undefined),
  } satisfies Prisma.community_platform_membersWhereInput;
  const orderBy =
    sortBy === "displayName"
      ? ([
          {
            userProfile: {
              display_name: sortOrder as unknown as Prisma.SortOrder,
            },
          },
          { created_at: sortOrder as unknown as Prisma.SortOrder },
        ] as const)
      : ([{ created_at: sortOrder as unknown as Prisma.SortOrder }] as const);
  const members = await MyGlobal.prisma.community_platform_members.findMany({
    where,
    skip,
    take: limit,
    orderBy:
      orderBy as unknown as Prisma.Enumerable<Prisma.community_platform_membersOrderByWithRelationInput>,
    select: {
      id: true,
      userProfile: {
        select: {
          display_name: true,
          bio: true,
          avatar_uri: true,
          deleted_at: true,
        },
      },
    },
  });
  const records = await MyGlobal.prisma.community_platform_members.count({
    where,
  });
  const pages = records === 0 ? 0 : Math.ceil(records / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: records,
      pages: pages,
    } satisfies IPage.IPagination,
    data: members.map((m) => {
      const profile = m.userProfile?.deleted_at === null ? m.userProfile : null;
      const avatar_uri = profile?.avatar_uri ?? null;
      return {
        id: m.id,
        display_name: profile?.display_name ?? "",
        bio: profile?.bio ?? null,
        avatar_uri: avatar_uri,
      };
    }),
  };
}
