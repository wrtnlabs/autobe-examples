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
  // Validate target user exists and is not deleted
  const targetUser = await MyGlobal.prisma.reddit_community_members.findUnique({
    where: {
      id: props.userId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (targetUser === null) {
    throw new HttpException("User not found", 404);
  }
  // Build filter conditions
  const whereInput: Prisma.reddit_community_postsWhereInput = {
    author_id: props.userId,
    deleted_at: null,
    ...(props.body.community_id !== undefined && {
      community_id: props.body.community_id,
    }),
    ...(props.body.search !== undefined &&
      props.body.search !== "" && {
        title: {
          contains: props.body.search,
        },
      }),
  } satisfies Prisma.reddit_community_postsWhereInput;
  // Get total count
  const total = await MyGlobal.prisma.reddit_community_posts.count({
    where: whereInput,
  });
  // Get paginated results
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const posts = await MyGlobal.prisma.reddit_community_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...RedditCommunityPostAtSummaryTransformer.select(),
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      posts,
      RedditCommunityPostAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditCommunityPost.ISummary;
}
