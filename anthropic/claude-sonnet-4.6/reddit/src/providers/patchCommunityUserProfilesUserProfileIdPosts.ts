import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPostAtSummaryTransformer } from "../transformers/CommunityPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityUserProfilesUserProfileIdPosts(props: {
  userProfileId: string & tags.Format<"uuid">;
  body: ICommunityPost.IRequest;
}): Promise<IPageICommunityPost.ISummary> {
  // Step 1: Resolve user profile → community_member_id (throws 404 if not found)
  const profile =
    await MyGlobal.prisma.community_user_profiles.findUniqueOrThrow({
      where: { id: props.userProfileId },
      select: { community_member_id: true },
    });
  // Step 2: Pagination params
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Step 3: Build where clause
  const whereInput = {
    community_member_id: profile.community_member_id,
    deleted_at: null,
    ...(props.body.keyword != null && {
      title: { contains: props.body.keyword, mode: "insensitive" },
    }),
    ...(props.body.type != null && {
      type: props.body.type,
    }),
    ...((props.body.createdAtFrom != null ||
      props.body.createdAtTo != null) && {
      created_at: {
        ...(props.body.createdAtFrom != null && {
          gte: new Date(props.body.createdAtFrom),
        }),
        ...(props.body.createdAtTo != null && {
          lte: new Date(props.body.createdAtTo),
        }),
      },
    }),
  } satisfies Prisma.community_postsWhereInput;
  // Step 4: Sort order — default and all supported modes map to created_at DESC
  // (raw SQL prohibited; Prisma typed API cannot sort by computed aggregates like net vote score)
  const orderByInput = {
    created_at: "desc",
  } satisfies Prisma.community_postsOrderByWithRelationInput;
  // Step 5: Query posts
  const data = await MyGlobal.prisma.community_posts.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...CommunityPostAtSummaryTransformer.select(),
  });
  // Step 6: Count total matching records (sequential)
  const total = await MyGlobal.prisma.community_posts.count({
    where: whereInput,
  });
  // Step 7: Transform to summary DTOs
  const transformed = await ArrayUtil.asyncMap(
    data,
    CommunityPostAtSummaryTransformer.transform,
  );
  // Step 8: Return paginated response
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformed,
  };
}
