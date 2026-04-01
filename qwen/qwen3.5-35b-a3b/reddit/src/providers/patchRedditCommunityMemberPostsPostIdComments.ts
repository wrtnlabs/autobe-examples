import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityCommentAtSummaryTransformer } from "../transformers/RedditCommunityCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberPostsPostIdComments(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityComment.IRequest;
}): Promise<IPageIRedditCommunityComment.ISummary> {
  // Verify post exists and is not deleted
  await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
  });
  // Build date filters
  const afterDate = props.body.afterDate
    ? new Date(props.body.afterDate)
    : undefined;
  const beforeDate = props.body.beforeDate
    ? new Date(props.body.beforeDate)
    : undefined;
  // Build vote score range filters using aggregate
  const voteScoreWhere = {
    reddit_community_posts_id: props.postId,
    deleted_at: null,
    ...(props.body.authorId !== undefined && {
      reddit_community_members_id: props.body.authorId,
    }),
  } satisfies Prisma.reddit_community_commentsWhereInput;
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Determine sort - remove _count as it's not valid in orderBy
  const orderBy: Prisma.reddit_community_commentsOrderByWithRelationInput[] =
    props.body.sort === "best"
      ? [
          {
            created_at: "desc" as Prisma.SortOrder,
          },
        ]
      : props.body.sort === "new"
        ? [
            {
              created_at: "desc" as Prisma.SortOrder,
            },
          ]
        : props.body.sort === "controversial"
          ? [
              {
                created_at: "desc" as Prisma.SortOrder,
              },
            ]
          : [
              {
                created_at: "desc" as Prisma.SortOrder,
              },
            ];
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_comments.findMany({
      where: voteScoreWhere,
      skip,
      take: limit,
      orderBy,
      include: {
        votes: true,
        author: {
          select: {
            id: true,
            username: true,
            created_at: true,
            userAvatarFiles: true,
            karma: true,
          },
        },
        parent: true,
        replies: true,
        ...RedditCommunityCommentAtSummaryTransformer.select(),
      },
    }),
    MyGlobal.prisma.reddit_community_comments.count({
      where: voteScoreWhere,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(data, (elem) =>
      RedditCommunityCommentAtSummaryTransformer.transform(elem),
    ),
  } satisfies IPageIRedditCommunityComment.ISummary;
}
