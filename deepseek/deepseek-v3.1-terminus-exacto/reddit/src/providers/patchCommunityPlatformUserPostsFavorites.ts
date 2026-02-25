import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostFavorite";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformPostFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostFavorite";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformPostFavoriteAtSummaryTransformer } from "../transformers/CommunityPlatformPostFavoriteAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformUserPostsFavorites(props: {
  user: UserPayload;
  body: ICommunityPlatformPostFavorite.IRequest;
}): Promise<IPageICommunityPlatformPostFavorite.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where condition - user can only see their own favorites
  const whereInput = {
    deleted_at: null,
    user_id: props.user.id,
    ...(props.body.post_id && { post_id: props.body.post_id }),
    ...(props.body.created_at_from && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to && {
      created_at: { lte: new Date(props.body.created_at_to) },
    }),
    // Ensure we only include non-deleted posts
    post: {
      deleted_at: null,
      ...(props.body.search && {
        OR: [
          { title: { contains: props.body.search, mode: "insensitive" } },
          {
            user: {
              username: { contains: props.body.search, mode: "insensitive" },
            },
          },
        ],
      }),
    },
  } satisfies Prisma.community_platform_post_favoritesWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_post_favorites.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...CommunityPlatformPostFavoriteAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_post_favorites.count({
      where: whereInput,
    }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformPostFavoriteAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
