import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformUserActivity";
import { IRedditPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserActivity";
import { IRedditPlatformUserActivityCommentSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserActivityCommentSummary";
import { IRedditPlatformUserActivityPostSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserActivityPostSummary";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberUsersUsernameActivity(props: {
  member: MemberPayload;
  username: string;
  body: IRedditPlatformUserActivity.IRequest;
}): Promise<IPageIRedditPlatformUserActivity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const user = await MyGlobal.prisma.reddit_platform_members.findFirst({
    where: {
      username: props.username,
      deleted_at: null,
    },
  });
  if (user === null) {
    throw new HttpException("User not found", 404);
  }
  const excludeDeleted = props.body.includeDeleted !== true;
  const contentType = props.body.contentType ?? "both";
  const postWhere: Prisma.reddit_platform_postsWhereInput = {
    author_id: user.id,
    ...(excludeDeleted && { deleted_at: null }),
  };
  const commentWhere: Prisma.reddit_platform_commentsWhereInput = {
    reddit_platform_member_id: user.id,
    ...(excludeDeleted && { deleted_at: null }),
  };
  if (props.body.startDate !== undefined) {
    postWhere.created_at = { gte: props.body.startDate };
    commentWhere.created_at = { gte: props.body.startDate };
  }
  if (props.body.endDate !== undefined) {
    if (
      postWhere.created_at !== undefined &&
      typeof postWhere.created_at === "object"
    ) {
      postWhere.created_at = {
        ...postWhere.created_at,
        lte: props.body.endDate,
      };
    } else {
      postWhere.created_at = { lte: props.body.endDate };
    }
    if (
      commentWhere.created_at !== undefined &&
      typeof commentWhere.created_at === "object"
    ) {
      commentWhere.created_at = {
        ...commentWhere.created_at,
        lte: props.body.endDate,
      };
    } else {
      commentWhere.created_at = { lte: props.body.endDate };
    }
  }
  if (contentType === "posts") {
    const postsData = await MyGlobal.prisma.reddit_platform_posts.findMany({
      where: postWhere,
      include: {
        community: true,
      },
      skip,
      take: limit,
      orderBy: (props.body.sortBy === "votes"
        ? [{ upvotes_count: props.body.sortOrder === "asc" ? "asc" : "desc" }]
        : [
            { created_at: props.body.sortOrder === "asc" ? "asc" : "desc" },
          ]) satisfies Prisma.reddit_platform_postsOrderByWithRelationInput[],
    });
    const postSummary: IRedditPlatformUserActivityPostSummary[] = postsData.map(
      (post) => ({
        id: post.id,
        type: "post",
        communityName: post.community?.name ?? "Unknown",
        createdAt: toISOStringSafe(post.created_at),
        isDeleted: post.deleted_at !== null,
        title: post.title,
      }),
    );
    const total = await MyGlobal.prisma.reddit_platform_posts.count({
      where: postWhere,
    });
    return {
      data: postSummary,
      pagination: {
        current: page,
        limit,
        records: total,
        pages: total === 0 ? 0 : Math.ceil(total / limit),
      } satisfies IPage.IPagination,
    };
  }
  if (contentType === "comments") {
    const commentsData =
      await MyGlobal.prisma.reddit_platform_comments.findMany({
        where: commentWhere,
        include: {
          post: {
            include: {
              community: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: (props.body.sortBy === "votes"
          ? [{ upvotes_count: props.body.sortOrder === "asc" ? "asc" : "desc" }]
          : [
              { created_at: props.body.sortOrder === "asc" ? "asc" : "desc" },
            ]) satisfies Prisma.reddit_platform_commentsOrderByWithRelationInput[],
      });
    const commentSummary: IRedditPlatformUserActivityCommentSummary[] =
      commentsData.map((comment) => {
        const truncatedContent =
          comment.content.length > 200
            ? comment.content.substring(0, 200)
            : comment.content;
        return {
          id: comment.id,
          type: "comment",
          communityName: comment.post?.community?.name ?? "Unknown",
          createdAt: toISOStringSafe(comment.created_at),
          isDeleted: comment.deleted_at !== null,
          content: truncatedContent,
        };
      });
    const total = await MyGlobal.prisma.reddit_platform_comments.count({
      where: commentWhere,
    });
    return {
      data: commentSummary,
      pagination: {
        current: page,
        limit,
        records: total,
        pages: total === 0 ? 0 : Math.ceil(total / limit),
      } satisfies IPage.IPagination,
    };
  }
  const [postsData, commentsData] = await Promise.all([
    MyGlobal.prisma.reddit_platform_posts.findMany({
      where: postWhere,
      include: {
        community: true,
      },
      skip,
      take: limit,
      orderBy: (props.body.sortBy === "votes"
        ? [{ upvotes_count: props.body.sortOrder === "asc" ? "asc" : "desc" }]
        : [
            { created_at: props.body.sortOrder === "asc" ? "asc" : "desc" },
          ]) satisfies Prisma.reddit_platform_postsOrderByWithRelationInput[],
    }),
    MyGlobal.prisma.reddit_platform_comments.findMany({
      where: commentWhere,
      include: {
        post: {
          include: {
            community: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: (props.body.sortBy === "votes"
        ? [{ upvotes_count: props.body.sortOrder === "asc" ? "asc" : "desc" }]
        : [
            { created_at: props.body.sortOrder === "asc" ? "asc" : "desc" },
          ]) satisfies Prisma.reddit_platform_commentsOrderByWithRelationInput[],
    }),
  ]);
  const postSummary: IRedditPlatformUserActivityPostSummary[] = postsData.map(
    (post) => ({
      id: post.id,
      type: "post",
      communityName: post.community?.name ?? "Unknown",
      createdAt: toISOStringSafe(post.created_at),
      isDeleted: post.deleted_at !== null,
      title: post.title,
    }),
  );
  const commentSummary: IRedditPlatformUserActivityCommentSummary[] =
    commentsData.map((comment) => {
      const truncatedContent =
        comment.content.length > 200
          ? comment.content.substring(0, 200)
          : comment.content;
      return {
        id: comment.id,
        type: "comment",
        communityName: comment.post?.community?.name ?? "Unknown",
        createdAt: toISOStringSafe(comment.created_at),
        isDeleted: comment.deleted_at !== null,
        content: truncatedContent,
      };
    });
  const allActivity: Array<
    | IRedditPlatformUserActivityPostSummary
    | IRedditPlatformUserActivityCommentSummary
  > = [...postSummary, ...commentSummary];
  allActivity.sort((a, b) => {
    const aDate = a.createdAt;
    const bDate = b.createdAt;
    return props.body.sortOrder === "asc"
      ? aDate.localeCompare(bDate)
      : bDate.localeCompare(aDate);
  });
  const totalPostCount = await MyGlobal.prisma.reddit_platform_posts.count({
    where: postWhere,
  });
  const totalCommentCount =
    await MyGlobal.prisma.reddit_platform_comments.count({
      where: commentWhere,
    });
  const totalCount = totalPostCount + totalCommentCount;
  const finalData = allActivity.slice(0, limit);
  return {
    data: finalData,
    pagination: {
      current: page,
      limit,
      records: totalCount,
      pages: totalCount === 0 ? 0 : Math.ceil(totalCount / limit),
    } satisfies IPage.IPagination,
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IRedditPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserActivity";
// import { IPageIRedditPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformUserActivity";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditPlatformUserActivityPostSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserActivityPostSummary";
// import { IRedditPlatformUserActivityCommentSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserActivityCommentSummary";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditPlatformMemberUsersUsernameActivity(props: {
//   member: MemberPayload;
//   username: string;
//   body: IRedditPlatformUserActivity.IRequest;
// }): Promise<IPageIRedditPlatformUserActivity.ISummary> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------