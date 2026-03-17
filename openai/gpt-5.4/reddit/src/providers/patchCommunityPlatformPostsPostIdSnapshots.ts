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
import { CommunityPlatformPostSnapshotAtSummaryTransformer } from "../transformers/CommunityPlatformPostSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformPostsPostIdSnapshots(props: {
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostSnapshot.IRequest;
}): Promise<IPageICommunityPlatformPostSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: {
        id: true,
        status: true,
        deleted_at: true,
      },
    },
  );
  if (post.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  if (
    post.status === "deleted" ||
    post.status === "removed" ||
    post.status === "unavailable"
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const where = {
    community_platform_post_id: props.postId,
    ...(props.body.visibility_state !== undefined
      ? { visibility_state: props.body.visibility_state }
      : {}),
  } satisfies Prisma.community_platform_post_snapshotsWhereInput;
  const orderBy = (
    props.body.sort === "created_at_asc"
      ? [{ created_at: "asc" }, { revision_no: "asc" }]
      : props.body.sort === "created_at_desc"
        ? [{ created_at: "desc" }, { revision_no: "desc" }]
        : props.body.sort === "revision_no_asc"
          ? [{ revision_no: "asc" }, { created_at: "asc" }]
          : props.body.sort === "revision_no_desc" ||
              props.body.sort === undefined
            ? [{ revision_no: "desc" }, { created_at: "desc" }]
            : [{ revision_no: "desc" }, { created_at: "desc" }]
  ) satisfies Prisma.community_platform_post_snapshotsOrderByWithRelationInput[];
  const data = await MyGlobal.prisma.community_platform_post_snapshots.findMany(
    {
      where,
      skip,
      take: limit,
      orderBy,
      ...CommunityPlatformPostSnapshotAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.community_platform_post_snapshots.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPlatformPostSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
