import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { CommunityPlatformCommentAtSummaryTransformer } from "../transformers/CommunityPlatformCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformGuestComments(props: {
  guest: GuestPayload;
  body: ICommunityPlatformComment.IRequest;
}): Promise<IPageICommunityPlatformComment.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  if (props.body.postId !== undefined) {
    await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
      where: { id: props.body.postId },
      select: { id: true },
    });
  }
  const where: Prisma.community_platform_commentsWhereInput = {
    deleted_at: null,
    ...(props.body.postId !== undefined
      ? { community_platform_post_id: props.body.postId }
      : {}),
    ...(props.body.parentId !== undefined
      ? { parent_id: props.body.parentId }
      : {}),
  };
  const orderBy: Prisma.community_platform_commentsOrderByWithRelationInput =
    props.body.sort === "new" ? { created_at: "desc" } : { created_at: "desc" };
  const data = await MyGlobal.prisma.community_platform_comments.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...CommunityPlatformCommentAtSummaryTransformer.select(),
  });
  const records = await MyGlobal.prisma.community_platform_comments.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPlatformCommentAtSummaryTransformer.transform,
    ),
  };
}
