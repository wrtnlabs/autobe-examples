import { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminPostsPostIdSnapshots(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IPageICommunityPlatformPostSnapshot> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    community_platform_post_id: props.postId,
    deleted_at: null,
  } satisfies Prisma.community_platform_post_snapshotsWhereInput;
  const data = await MyGlobal.prisma.community_platform_post_snapshots.findMany(
    {
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        community_platform_post_id: true,
        title: true,
        content_text: true,
        content_url: true,
        content_image_url: true,
        post_type: true,
        author_user_id: true,
        community_id: true,
        vote_score: true,
        comment_count: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  const total = await MyGlobal.prisma.community_platform_post_snapshots.count({
    where: whereInput,
  });
  return {
    data: data.map((snapshot) => ({
      id: snapshot.id,
      community_platform_post_id: snapshot.community_platform_post_id,
      title: snapshot.title,
      content_text:
        snapshot.content_text === null ? null : snapshot.content_text,
      content_url: snapshot.content_url === null ? null : snapshot.content_url,
      content_image_url:
        snapshot.content_image_url === null ? null : snapshot.content_image_url,
      post_type: snapshot.post_type,
      author_user_id: snapshot.author_user_id,
      community_id: snapshot.community_id,
      vote_score: snapshot.vote_score,
      comment_count: snapshot.comment_count,
      created_at: toISOStringSafe(snapshot.created_at),
      updated_at: toISOStringSafe(snapshot.updated_at),
      deleted_at:
        snapshot.deleted_at === null
          ? null
          : toISOStringSafe(snapshot.deleted_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
