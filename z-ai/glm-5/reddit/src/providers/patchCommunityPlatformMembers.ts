import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMembers(props: {
  body: ICommunityPlatformMember.IRequest;
}): Promise<IPageICommunityPlatformMember.ISummary> {
  const limit = props.body.limit ?? 100;
  const page = props.body.page ?? 1;
  const where = {
    deleted_at: null,
    ...(props.body.search !== undefined && {
      username: { contains: props.body.search, mode: "insensitive" as const },
    }),
    ...(props.body.minKarma !== undefined || props.body.maxKarma !== undefined
      ? {
          karma: {
            ...(props.body.minKarma !== undefined && {
              gte: props.body.minKarma,
            }),
            ...(props.body.maxKarma !== undefined && {
              lte: props.body.maxKarma,
            }),
          },
        }
      : {}),
  } satisfies Prisma.community_platform_membersWhereInput;
  const orderBy =
    props.body.sortBy === "username"
      ? ({ username: props.body.sortDirection ?? "desc" } as const)
      : props.body.sortBy === "karma"
        ? ({ karma: props.body.sortDirection ?? "desc" } as const)
        : ({ created_at: props.body.sortDirection ?? "desc" } as const);
  const members = await MyGlobal.prisma.community_platform_members.findMany({
    where,
    ...(props.body.cursor !== undefined
      ? { cursor: { created_at: new Date(props.body.cursor) }, skip: 1 }
      : { skip: (page - 1) * limit }),
    take: limit,
    orderBy,
    select: {
      id: true,
      username: true,
      display_name: true,
      bio: true,
      karma: true,
      created_at: true,
    },
  });
  const avatarFiles = await MyGlobal.prisma.community_platform_files.findMany({
    where: {
      owner_type: "user_avatar",
      owner_id: { in: members.map((m) => m.id) },
    },
  });
  const avatarMap = new Map(avatarFiles.map((f) => [f.owner_id, f]));
  const data = members.map((member) => {
    const avatar = avatarMap.get(member.id);
    return {
      id: member.id,
      username: member.username,
      displayName: member.display_name,
      bio: member.bio,
      karma: member.karma,
      avatar: avatar
        ? {
            id: avatar.id,
            ownerType: avatar.owner_type,
            ownerId: avatar.owner_id,
            path: avatar.path,
            size: avatar.size,
            mimeType: avatar.mime_type,
            createdAt: avatar.created_at.toISOString(),
          }
        : null,
      createdAt: member.created_at.toISOString(),
    } satisfies ICommunityPlatformMember.ISummary;
  });
  const total = await MyGlobal.prisma.community_platform_members.count({
    where,
  });
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageICommunityPlatformMember.ISummary;
}
