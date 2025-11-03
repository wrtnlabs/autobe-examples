import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import { IPageICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";

export async function patchCommunityBbsPostsPostIdComments(props: {
  postId: string & tags.Format<"uuid">;
  body: ICommunityBbsComment.IRequest;
}): Promise<IPageICommunityBbsComment.ISummary> {
  const { postId, body } = props;

  const page = (body.page ?? 0) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  let limit = (body.limit ?? 25) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  if (limit > 100)
    limit = 100 as number & tags.Type<"int32"> & tags.Maximum<100>;
  if (page < 0) throw new HttpException("Bad Request: page must be >= 0", 400);

  const post = await MyGlobal.prisma.community_bbs_posts.findUniqueOrThrow({
    where: { id: postId },
    include: {
      community: {
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              karma: true,
              created_at: true,
              updated_at: true,
            },
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          visibility: true,
          post_approval_required: true,
          members_count: true,
          posts_count: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          creator: true,
        },
      },
    },
  });

  if (!post.is_published || post.deleted_at !== null)
    throw new HttpException("Not Found", 404);
  const community = post.community;
  if (
    !community ||
    community.deleted_at !== null ||
    community.visibility !== "public"
  )
    throw new HttpException("Not Found", 404);

  const whereCondition = {
    community_bbs_post_id: postId,
    deleted_at: null,
    ...(body.parent_id !== undefined &&
      body.parent_id !== null && { community_bbs_parent_id: body.parent_id }),
    ...(body.author_id !== undefined &&
      body.author_id !== null && {
        community_bbs_communitymember_id: body.author_id,
      }),
    ...((body.min_score !== undefined && body.min_score !== null) ||
    (body.max_score !== undefined && body.max_score !== null)
      ? {
          score: {
            ...(body.min_score !== undefined &&
              body.min_score !== null && { gte: body.min_score }),
            ...(body.max_score !== undefined &&
              body.max_score !== null && { lte: body.max_score }),
          },
        }
      : {}),
    ...((body.date_from !== undefined && body.date_from !== null) ||
    (body.date_to !== undefined && body.date_to !== null)
      ? {
          created_at: {
            ...(body.date_from !== undefined &&
              body.date_from !== null && { gte: body.date_from }),
            ...(body.date_to !== undefined &&
              body.date_to !== null && { lte: body.date_to }),
          },
        }
      : {}),
    ...(body.q !== undefined &&
      body.q !== null && { body: { contains: body.q } }),
  };

  const orderBy =
    body.sort === "top"
      ? { score: "desc" as const, created_at: "desc" as const }
      : { created_at: "desc" as const };

  const skip = Number(page) * Number(limit);
  const take = Number(limit);

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_bbs_comments.findMany({
      where: whereCondition,
      include: { author: { include: { community_bbs_profiles: true } } },
      orderBy,
      skip,
      take,
    }),
    MyGlobal.prisma.community_bbs_comments.count({ where: whereCondition }),
  ]);

  const data = rows.map((r) => {
    const author = r.author;
    const authorSummary = {
      id: author.id,
      username: author.username,
      display_name: author.community_bbs_profiles
        ? author.community_bbs_profiles.display_name
        : (author.display_name ?? null),
      karma: author.karma,
      created_at: toISOStringSafe(author.created_at),
      updated_at: toISOStringSafe(author.updated_at),
    } satisfies ICommunityBbsCommunityMember.ISummary;

    const bodySnippet = (r.body ?? "").slice(0, 200);

    return {
      id: r.id,
      body_snippet: bodySnippet,
      author: authorSummary,
      community: {
        id: community.id,
        name: community.name,
        slug: community.slug,
        description: community.description,
        creator: {
          id: community.creator.id,
          username: community.creator.username,
          display_name: null,
          karma: community.creator.karma,
          created_at: toISOStringSafe(community.creator.created_at),
          updated_at: toISOStringSafe(community.creator.updated_at),
        },
        visibility: typia.assert<"public" | "restricted" | "private">(
          community.visibility,
        ),
        post_approval_required: community.post_approval_required,
        members_count: Number(community.members_count),
        posts_count: Number(community.posts_count),
        created_at: toISOStringSafe(community.created_at),
        updated_at: toISOStringSafe(community.updated_at),
        deleted_at: community.deleted_at
          ? toISOStringSafe(community.deleted_at)
          : null,
      },
      parent_id: r.community_bbs_parent_id ?? null,
      score: r.score,
      upvotes: r.upvotes,
      downvotes: r.downvotes,
      created_at: toISOStringSafe(r.created_at),
    } satisfies ICommunityBbsComment.ISummary;
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  } satisfies IPageICommunityBbsComment.ISummary;
}
