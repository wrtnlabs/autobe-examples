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

export async function patchCommunityPlatformAdminPostSnapshots(props: {
  admin: AdminPayload;
  body: ICommunityPlatformPostSnapshot.IRequest;
}): Promise<IPageICommunityPlatformPostSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const createdAtFilter: {
    gte?: string & tags.Format<"date-time">;
    lte?: string & tags.Format<"date-time">;
  } = {};
  if (props.body.createdAtFrom !== undefined) {
    createdAtFilter.gte = props.body.createdAtFrom;
  }
  if (props.body.createdAtTo !== undefined) {
    createdAtFilter.lte = props.body.createdAtTo;
  }
  const where = {
    ...(props.body.postId !== undefined && {
      community_platform_post_id: props.body.postId,
    }),
    ...(props.body.authorUserId !== undefined && {
      author_user_id: props.body.authorUserId,
    }),
    ...(props.body.communityId !== undefined && {
      community_id: props.body.communityId,
    }),
    ...(Object.keys(createdAtFilter).length > 0 && {
      created_at: createdAtFilter,
    }),
    deleted_at: null,
  };
  const data = await MyGlobal.prisma.community_platform_post_snapshots.findMany(
    {
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    },
  );
  const totalCount =
    await MyGlobal.prisma.community_platform_post_snapshots.count({ where });
  const formattedData = data.map((snapshot) => ({
    id: snapshot.id as string & tags.Format<"uuid">,
    communityPlatformPostId: snapshot.community_platform_post_id as string &
      tags.Format<"uuid">,
    title: snapshot.title,
    contentText: snapshot.content_text ?? null,
    contentUrl: snapshot.content_url ?? null,
    contentImageUrl: snapshot.content_image_url ?? null,
    postType: snapshot.post_type,
    authorUserId: snapshot.author_user_id as string & tags.Format<"uuid">,
    communityId: snapshot.community_id as string & tags.Format<"uuid">,
    voteScore: snapshot.vote_score,
    commentCount: snapshot.comment_count,
    createdAt:
      snapshot.created_at !== null
        ? toISOStringSafe(snapshot.created_at)
        : (undefined as unknown as string & tags.Format<"date-time">),
    updatedAt:
      snapshot.updated_at !== null
        ? toISOStringSafe(snapshot.updated_at)
        : (undefined as unknown as string & tags.Format<"date-time">),
    deletedAt:
      snapshot.deleted_at !== null
        ? toISOStringSafe(snapshot.deleted_at)
        : null,
  }));
  return {
    data: formattedData,
    pagination: {
      current: page,
      limit,
      records: totalCount,
      pages: Math.ceil(totalCount / limit),
    },
  };
}
