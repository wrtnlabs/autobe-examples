import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBBSSearchRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSSearchRequest";
import { IPageICommunityBBSReportResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBBSReportResult";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityBBSReportResult } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSReportResult";

export async function patchCommunityBBSSearch(props: {
  body: ICommunityBBSSearchRequest;
}): Promise<IPageICommunityBBSReportResult> {
  const searchTerm = props.body;

  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  // Query for matching posts
  const posts = await MyGlobal.prisma.community_bbs_posts.findMany({
    where: {
      deleted_at: null,
      status: "published",
      OR: [
        { title: { contains: searchTerm } },
        { body: { contains: searchTerm } },
      ],
    },
    orderBy: { created_at: "desc" },
    take: limit,
    skip,
  });

  // Query for matching comments
  const comments = await MyGlobal.prisma.community_bbs_comments.findMany({
    where: {
      deleted_at: null,
      business_status: "approved",
      body: { contains: searchTerm },
    },
    orderBy: { created_at: "desc" },
    take: limit,
    skip,
  });

  // Combine results with type discriminator
  const results = [
    ...posts.map((post) => ({
      type: "post",
      id: post.id,
      title: post.title,
      body: post.body,
      created_at: toISOStringSafe(post.created_at),
      updated_at: toISOStringSafe(post.updated_at),
      community_id: post.community_id,
      citizen_id: post.citizen_id,
    })),
    ...comments.map((comment) => ({
      type: "comment",
      id: comment.id,
      body: comment.body,
      created_at: toISOStringSafe(comment.created_at),
      updated_at: toISOStringSafe(comment.updated_at),
      post_id: comment.post_id,
      citizen_id: comment.citizen_id,
    })),
  ];

  // Sort combined results by creation date (most recent first)
  results.sort((a, b) => b.created_at.localeCompare(a.created_at));

  // Truncate to limit size
  const paginatedResults = results.slice(0, limit);

  // Calculate total records by counting both tables
  const totalPosts = await MyGlobal.prisma.community_bbs_posts.count({
    where: {
      deleted_at: null,
      status: "published",
      OR: [
        { title: { contains: searchTerm } },
        { body: { contains: searchTerm } },
      ],
    },
  });

  const totalComments = await MyGlobal.prisma.community_bbs_comments.count({
    where: {
      deleted_at: null,
      business_status: "approved",
      body: { contains: searchTerm },
    },
  });

  const totalRecords = totalPosts + totalComments;
  const totalPages = Math.ceil(totalRecords / limit);

  return {
    pagination: {
      current: page,
      limit,
      records: totalRecords,
      pages: totalPages,
    },
    data: typia.assert<ICommunityBBSReportResult[]>(paginatedResults),
  };
}
