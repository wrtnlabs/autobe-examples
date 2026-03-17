import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityCommentAtSummaryTransformer } from "../transformers/CommunityCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPostsPostIdComments(props: {
  postId: string & tags.Format<"uuid">;
  body: ICommunityComment.IRequest;
}): Promise<IPageICommunityComment.ISummary> {
  // Step 1: Validate post exists and is not deleted
  await MyGlobal.prisma.community_posts.findFirstOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: { id: true },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const sort = props.body.sort ?? "best";
  // Step 2: Build created_at range filter
  const createdAtFilter: Prisma.community_commentsWhereInput["created_at"] =
    props.body.createdAtFrom != null || props.body.createdAtTo != null
      ? {
          ...(props.body.createdAtFrom != null
            ? { gte: new Date(props.body.createdAtFrom) }
            : {}),
          ...(props.body.createdAtTo != null
            ? { lte: new Date(props.body.createdAtTo) }
            : {}),
        }
      : undefined;
  // Step 3: Build parentId filter
  const parentIdFilter: Prisma.community_commentsWhereInput =
    props.body.parentId === null
      ? { parent_id: null }
      : props.body.parentId !== undefined
        ? { parent_id: props.body.parentId }
        : {};
  // Step 4: Build full WHERE clause
  const whereInput = {
    // Path-param scoped post filter (body.postId is ignored; already scoped by path)
    post_id: props.postId,
    deleted_at: null,
    ...parentIdFilter,
    ...(props.body.keyword != null
      ? {
          content: {
            contains: props.body.keyword,
            mode: "insensitive" as const,
          },
        }
      : {}),
    ...(createdAtFilter !== undefined ? { created_at: createdAtFilter } : {}),
  } satisfies Prisma.community_commentsWhereInput;
  // Step 5: Apply sorting strategy
  if (sort === "new" || sort === "created_at_desc") {
    const orderByInput = {
      created_at: "desc" as const,
    } satisfies Prisma.community_commentsOrderByWithRelationInput;
    const skip = (page - 1) * limit;
    const data = await MyGlobal.prisma.community_comments.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...CommunityCommentAtSummaryTransformer.select(),
    });
    const total = await MyGlobal.prisma.community_comments.count({
      where: whereInput,
    });
    return {
      pagination: {
        current: page,
        limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
      data: await ArrayUtil.asyncMap(
        data,
        CommunityCommentAtSummaryTransformer.transform,
      ),
    };
  } else if (sort === "created_at_asc") {
    const orderByInput = {
      created_at: "asc" as const,
    } satisfies Prisma.community_commentsOrderByWithRelationInput;
    const skip = (page - 1) * limit;
    const data = await MyGlobal.prisma.community_comments.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...CommunityCommentAtSummaryTransformer.select(),
    });
    const total = await MyGlobal.prisma.community_comments.count({
      where: whereInput,
    });
    return {
      pagination: {
        current: page,
        limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
      data: await ArrayUtil.asyncMap(
        data,
        CommunityCommentAtSummaryTransformer.transform,
      ),
    };
  } else {
    // 'best' (default) or 'controversial':
    // Fetch all matching raw records (with votes for score computation), sort in memory, paginate
    const allRecords = await MyGlobal.prisma.community_comments.findMany({
      where: whereInput,
      ...CommunityCommentAtSummaryTransformer.select(),
    });
    // Sort raw records before transforming (more efficient)
    let sortedRecords: typeof allRecords;
    if (sort === "controversial") {
      // Controversial: most total votes (up + down), but net score near zero
      sortedRecords = [...allRecords].sort((a, b) => {
        const totalA = a.votes.length;
        const totalB = b.votes.length;
        const netA = a.votes.reduce(
          (sum, v) => sum + (v.vote_type === "up" ? 1 : -1),
          0,
        );
        const netB = b.votes.reduce(
          (sum, v) => sum + (v.vote_type === "up" ? 1 : -1),
          0,
        );
        // Many total votes DESC, then smallest absolute net score ASC (most divisive)
        if (totalB !== totalA) return totalB - totalA;
        return Math.abs(netA) - Math.abs(netB);
      });
    } else {
      // 'best': highest net vote score first
      sortedRecords = [...allRecords].sort((a, b) => {
        const netA = a.votes.reduce(
          (sum, v) => sum + (v.vote_type === "up" ? 1 : -1),
          0,
        );
        const netB = b.votes.reduce(
          (sum, v) => sum + (v.vote_type === "up" ? 1 : -1),
          0,
        );
        return netB - netA;
      });
    }
    const total = sortedRecords.length;
    const skip = (page - 1) * limit;
    const pageRecords = sortedRecords.slice(skip, skip + limit);
    return {
      pagination: {
        current: page,
        limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
      data: await ArrayUtil.asyncMap(
        pageRecords,
        CommunityCommentAtSummaryTransformer.transform,
      ),
    };
  }
}
