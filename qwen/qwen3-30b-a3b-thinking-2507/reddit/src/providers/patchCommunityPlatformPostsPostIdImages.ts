import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformPostImageAtSummaryTransformer } from "../transformers/CommunityPlatformPostImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformPostsPostIdImages(props: {
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostImage.IRequest;
}): Promise<IPageICommunityPlatformPostImage.ISummary> {
  const page = props.body.page ?? 1;
  const pageSize = props.body.pageSize ?? 100;
  const skip = (page - 1) * pageSize;
  const sortField = props.body.sort?.split(":")[0] || "created_at";
  const sortDirection =
    props.body.sort?.split(":")[1] === "asc" ? "asc" : "desc";
  const data = await MyGlobal.prisma.community_platform_post_images.findMany({
    where: {
      community_platform_post_id: props.postId,
      deleted_at: null,
    },
    skip,
    take: pageSize,
    orderBy: {
      [sortField]: sortDirection as Prisma.SortOrder,
    } satisfies Prisma.community_platform_post_imagesOrderByWithRelationInput,
    ...CommunityPlatformPostImageAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_platform_post_images.count({
    where: {
      community_platform_post_id: props.postId,
      deleted_at: null,
    },
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPlatformPostImageAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
    } satisfies IPage.IPagination,
  };
}
