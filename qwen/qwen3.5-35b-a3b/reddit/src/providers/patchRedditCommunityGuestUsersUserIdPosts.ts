import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditCommunityPostAtSummaryTransformer } from "../transformers/RedditCommunityPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityGuestUsersUserIdPosts(props: {
  guest: GuestPayload;
  userId: string & tags.Format<"uuid">;
  body: IRedditCommunityPost.IRequest;
}): Promise<IPageIRedditCommunityPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const search = props.body.search ?? undefined;
  const community_id = props.body.community_id ?? undefined;
  await MyGlobal.prisma.reddit_community_members.findUniqueOrThrow({
    where: {
      id: props.userId,
      deleted_at: null,
    },
  });
  const whereInput: Prisma.reddit_community_postsWhereInput = {
    author_id: props.userId,
    deleted_at: null,
    ...(search !== undefined && {
      title: {
        contains: search,
        mode: "insensitive",
      },
    }),
    ...(community_id !== undefined && {
      community_id,
    }),
  } satisfies Prisma.reddit_community_postsWhereInput;
  const orderByInput = {
    created_at: "desc",
  } satisfies Prisma.reddit_community_postsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.reddit_community_posts.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip: (page - 1) * limit,
    take: limit,
    ...RedditCommunityPostAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_community_posts.count({
    where: whereInput,
  });
  const records = await ArrayUtil.asyncMap(
    data,
    RedditCommunityPostAtSummaryTransformer.transform,
  );
  const pages = Math.ceil(total / limit);
  return {
    data: records,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditCommunityPost.ISummary;
}
