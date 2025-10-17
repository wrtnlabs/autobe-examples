import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IECommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostType";
import { IECommunityPlatformPostVisibilityState } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostVisibilityState";

export async function getCommunityPlatformCommunitiesCommunityIdPosts(props: {
  communityId: string & tags.Format<"uuid">;
}): Promise<IPageICommunityPlatformPost> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: props.communityId },
    });
  if (!community) throw new HttpException("Not Found", 404);
  if (community.deleted_at !== null) throw new HttpException("Not Found", 404);

  // Enforce community visibility policies for public endpoint
  if (community.visibility !== "public") {
    throw new HttpException("COMMUNITY_PRIVATE", 403);
  }
  if (community.quarantined) {
    throw new HttpException("COMMUNITY_QUARANTINED", 403);
  }

  // Default pagination (0-based current page)
  const page = 0;
  const limit = 20;

  const excludedStates: IECommunityPlatformPostVisibilityState[] = [
    "RemovedByModeration",
    "RemovedByAdmin",
    "DeletedByAuthor",
    "PendingReview",
  ];

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_posts.findMany({
      where: {
        community_platform_community_id: props.communityId,
        deleted_at: null,
        OR: [
          { visibility_state: null },
          { visibility_state: { notIn: excludedStates } },
        ],
      },
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      skip: page * limit,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_posts.count({
      where: {
        community_platform_community_id: props.communityId,
        deleted_at: null,
        OR: [
          { visibility_state: null },
          { visibility_state: { notIn: excludedStates } },
        ],
      },
    }),
  ]);

  const data: ICommunityPlatformPost[] = rows.map((p) => ({
    id: p.id as string & tags.Format<"uuid">,
    community_platform_user_id: p.community_platform_user_id as string &
      tags.Format<"uuid">,
    community_platform_community_id:
      p.community_platform_community_id as string & tags.Format<"uuid">,
    title: p.title,
    type: p.type as IECommunityPlatformPostType,
    body: p.body ?? undefined,
    link_url: p.link_url ?? undefined,
    image_url: p.image_url ?? undefined,
    nsfw: p.nsfw,
    spoiler: p.spoiler,
    visibility_state:
      p.visibility_state === null
        ? null
        : typia.assert<IECommunityPlatformPostVisibilityState>(
            p.visibility_state,
          ),
    locked_at: p.locked_at ? toISOStringSafe(p.locked_at) : undefined,
    archived_at: p.archived_at ? toISOStringSafe(p.archived_at) : undefined,
    edited_at: p.edited_at ? toISOStringSafe(p.edited_at) : undefined,
    edit_count: Number(p.edit_count) as number & tags.Type<"int32">,
    created_at: toISOStringSafe(p.created_at),
    updated_at: toISOStringSafe(p.updated_at),
    deleted_at: p.deleted_at ? toISOStringSafe(p.deleted_at) : undefined,
  }));

  const records = Number(total);
  const pages = Math.ceil(records / limit);

  return {
    pagination: {
      current: Number(page) as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: Number(limit) as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: records as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Number(pages) as number & tags.Type<"int32"> & tags.Minimum<0>,
    },
    data,
  };
}
