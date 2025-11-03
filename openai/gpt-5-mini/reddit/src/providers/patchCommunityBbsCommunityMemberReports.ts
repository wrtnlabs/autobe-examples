import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsReport";
import { IPageICommunityBbsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import { CommunitymemberPayload } from "../decorators/payload/CommunitymemberPayload";

export async function patchCommunityBbsCommunityMemberReports(props: {
  communityMember: CommunitymemberPayload;
  body: ICommunityBbsReport.IRequest;
}): Promise<IPageICommunityBbsReport.ISummary> {
  const { communityMember, body } = props;

  // Pagination defaults and limits
  const take = Math.min(Number(body.limit ?? 25), 100);
  const page = Number(body.page ?? 1);
  const skip = (page - 1) * take;

  // Resolve community scope: explicit filter or infer from moderator assignments
  let communityIds: string[] = [];

  if (body.community_id !== undefined && body.community_id !== null) {
    const community =
      await MyGlobal.prisma.community_bbs_communities.findUnique({
        where: { id: body.community_id },
      });
    if (!community) throw new HttpException("Not Found", 404);

    const mod =
      await MyGlobal.prisma.community_bbs_community_moderators.findFirst({
        where: {
          community_id: community.id,
          community_member_id: communityMember.id,
          active: true,
        },
      });
    if (!mod)
      throw new HttpException("Unauthorized: moderator scope required", 403);
    communityIds = [community.id];
  } else if (
    body.community_slug !== undefined &&
    body.community_slug !== null
  ) {
    const community =
      await MyGlobal.prisma.community_bbs_communities.findUnique({
        where: { slug: body.community_slug },
      });
    if (!community) throw new HttpException("Not Found", 404);
    const mod =
      await MyGlobal.prisma.community_bbs_community_moderators.findFirst({
        where: {
          community_id: community.id,
          community_member_id: communityMember.id,
          active: true,
        },
      });
    if (!mod)
      throw new HttpException("Unauthorized: moderator scope required", 403);
    communityIds = [community.id];
  } else {
    const mods =
      await MyGlobal.prisma.community_bbs_community_moderators.findMany({
        where: { community_member_id: communityMember.id, active: true },
        select: { community_id: true },
      });
    communityIds = mods.map((m) => m.community_id);
    if (communityIds.length === 0) {
      return {
        pagination: {
          current: Number(page),
          limit: Number(take),
          records: 0,
          pages: 0,
        },
        data: [],
      };
    }
  }

  // If community scoping exists, collect post and comment ids for those communities
  let postIds: string[] = [];
  let commentIds: string[] = [];
  if (communityIds.length > 0) {
    const posts = await MyGlobal.prisma.community_bbs_posts.findMany({
      where: { community_bbs_community_id: { in: communityIds } },
      select: { id: true },
    });
    postIds = posts.map((p) => p.id);

    const comments = await MyGlobal.prisma.community_bbs_comments.findMany({
      where: { community_bbs_community_id: { in: communityIds } },
      select: { id: true },
    });
    commentIds = comments.map((c) => c.id);
  }

  // Build where condition inline
  const where: Record<string, unknown> = {
    ...(body.status !== undefined && { status: body.status }),
    ...(body.priority !== undefined && { priority: body.priority }),
    ...(body.target_type !== undefined && { target_type: body.target_type }),
    ...(body.handled_by_actor_type !== undefined && {
      handled_by_actor_type: body.handled_by_actor_type,
    }),
    ...(body.handled_by_actor_id !== undefined &&
      body.handled_by_actor_id !== null && {
        handled_by_actor_id: body.handled_by_actor_id,
      }),
  };

  if (body.reporter_present !== undefined && body.reporter_present !== null) {
    if (body.reporter_present === true)
      Object.assign(where, { reporter_id: { not: null } });
    else Object.assign(where, { reporter_id: null });
  }

  if (body.created_at_from !== undefined && body.created_at_from !== null) {
    Object.assign(where, {
      created_at: {
        ...((where.created_at as object) ?? {}),
        gte: body.created_at_from,
      },
    });
  }
  if (body.created_at_to !== undefined && body.created_at_to !== null) {
    Object.assign(where, {
      created_at: {
        ...((where.created_at as object) ?? {}),
        lte: body.created_at_to,
      },
    });
  }
  if (body.updated_at_from !== undefined && body.updated_at_from !== null) {
    Object.assign(where, {
      updated_at: {
        ...((where.updated_at as object) ?? {}),
        gte: body.updated_at_from,
      },
    });
  }
  if (body.updated_at_to !== undefined && body.updated_at_to !== null) {
    Object.assign(where, {
      updated_at: {
        ...((where.updated_at as object) ?? {}),
        lte: body.updated_at_to,
      },
    });
  }
  if (body.resolved_at_from !== undefined && body.resolved_at_from !== null) {
    Object.assign(where, {
      resolved_at: {
        ...((where.resolved_at as object) ?? {}),
        gte: body.resolved_at_from,
      },
    });
  }
  if (body.resolved_at_to !== undefined && body.resolved_at_to !== null) {
    Object.assign(where, {
      resolved_at: {
        ...((where.resolved_at as object) ?? {}),
        lte: body.resolved_at_to,
      },
    });
  }

  if (body.text_query !== undefined && body.text_query !== null) {
    Object.assign(where, { explanation: { contains: body.text_query } });
  }

  if (communityIds.length > 0) {
    const ors: Record<string, unknown>[] = [];
    if (postIds.length > 0)
      ors.push({ target_type: "post", target_id: { in: postIds } });
    if (commentIds.length > 0)
      ors.push({ target_type: "comment", target_id: { in: commentIds } });
    ors.push({ target_type: "community", target_id: { in: communityIds } });
    Object.assign(where, { OR: ors });
  }

  const orderBy: Prisma.community_bbs_reportsOrderByWithRelationInput =
    body.sort_by === "priority"
      ? {
          priority: (body.sort_order === "asc"
            ? "asc"
            : "desc") as Prisma.SortOrder,
        }
      : body.sort_by === "status"
        ? {
            status: (body.sort_order === "asc"
              ? "asc"
              : "desc") as Prisma.SortOrder,
          }
        : {
            created_at: (body.sort_order === "asc"
              ? "asc"
              : "desc") as Prisma.SortOrder,
          };

  const result = await Promise.all([
    MyGlobal.prisma.community_bbs_reports.findMany({
      where: where as any,
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            display_name: true,
            karma: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
      orderBy,
      skip,
      take,
    }),
    MyGlobal.prisma.community_bbs_reports.count({ where: where as any }),
  ]);

  const reports = result[0] as any[];
  const total = result[1] as number;

  const data = await Promise.all(
    reports.map(async (r: any) => {
      const rep = (r as any).reporter;
      const reporterSummary = rep
        ? {
            id: rep.id,
            username: rep.username,
            display_name: rep.display_name ?? null,
            karma: rep.karma,
            created_at: toISOStringSafe(rep.created_at),
            updated_at: toISOStringSafe(rep.updated_at),
          }
        : null;

      let target: unknown = undefined;

      if (r.target_type === "post") {
        const post = await MyGlobal.prisma.community_bbs_posts.findUnique({
          where: { id: r.target_id },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                display_name: true,
                karma: true,
                created_at: true,
                updated_at: true,
              },
            },
            community: {
              include: {
                creator: {
                  select: {
                    id: true,
                    username: true,
                    display_name: true,
                    karma: true,
                    created_at: true,
                    updated_at: true,
                  },
                },
                community_bbs_community_settings: true,
              },
            },
          },
        });
        if (post) {
          target = {
            id: post.id,
            title: post.title,
            post_type: post.post_type,
            score: post.score,
            upvotes: post.upvotes,
            downvotes: post.downvotes,
            comment_count: post.comment_count,
            published_at: post.published_at
              ? toISOStringSafe(post.published_at)
              : null,
            is_published: post.is_published,
            created_at: toISOStringSafe(post.created_at),
            updated_at: toISOStringSafe(post.updated_at),
            author: post.author
              ? {
                  id: post.author.id,
                  username: post.author.username,
                  display_name: post.author.display_name ?? null,
                  karma: post.author.karma,
                  created_at: toISOStringSafe(post.author.created_at),
                  updated_at: toISOStringSafe(post.author.updated_at),
                }
              : undefined,
            community: post.community
              ? {
                  id: post.community.id,
                  name: post.community.name,
                  slug: post.community.slug,
                  description: post.community.description ?? null,
                  creator: post.community.creator
                    ? {
                        id: post.community.creator.id,
                        username: post.community.creator.username,
                        display_name:
                          post.community.creator.display_name ?? null,
                        karma: post.community.creator.karma,
                        created_at: toISOStringSafe(
                          post.community.creator.created_at,
                        ),
                        updated_at: toISOStringSafe(
                          post.community.creator.updated_at,
                        ),
                      }
                    : undefined,
                  visibility: post.community.visibility,
                  post_approval_required: post.community.post_approval_required,
                  members_count: post.community.members_count,
                  posts_count: post.community.posts_count,
                  created_at: toISOStringSafe(post.community.created_at),
                  updated_at: toISOStringSafe(post.community.updated_at),
                }
              : undefined,
          };
        }
      } else if (r.target_type === "comment") {
        const comment = await MyGlobal.prisma.community_bbs_comments.findUnique(
          {
            where: { id: r.target_id },
            include: {
              author: {
                select: {
                  id: true,
                  username: true,
                  display_name: true,
                  karma: true,
                  created_at: true,
                  updated_at: true,
                },
              },
              community: {
                include: {
                  creator: {
                    select: {
                      id: true,
                      username: true,
                      display_name: true,
                      karma: true,
                      created_at: true,
                      updated_at: true,
                    },
                  },
                  community_bbs_community_settings: true,
                },
              },
            },
          },
        );
        if (comment) {
          target = {
            id: comment.id,
            body_snippet: comment.body
              ? comment.body.length > 200
                ? comment.body.substring(0, 200)
                : comment.body
              : "",
            author: comment.author
              ? {
                  id: comment.author.id,
                  username: comment.author.username,
                  display_name: comment.author.display_name ?? null,
                  karma: comment.author.karma,
                  created_at: toISOStringSafe(comment.author.created_at),
                  updated_at: toISOStringSafe(comment.author.updated_at),
                }
              : undefined,
            community: comment.community
              ? {
                  id: comment.community.id,
                  name: comment.community.name,
                  slug: comment.community.slug,
                  description: comment.community.description ?? null,
                  creator: comment.community.creator
                    ? {
                        id: comment.community.creator.id,
                        username: comment.community.creator.username,
                        display_name:
                          comment.community.creator.display_name ?? null,
                        karma: comment.community.creator.karma,
                        created_at: toISOStringSafe(
                          comment.community.creator.created_at,
                        ),
                        updated_at: toISOStringSafe(
                          comment.community.creator.updated_at,
                        ),
                      }
                    : undefined,
                  visibility: comment.community.visibility,
                  post_approval_required:
                    comment.community.post_approval_required,
                  members_count: comment.community.members_count,
                  posts_count: comment.community.posts_count,
                  created_at: toISOStringSafe(comment.community.created_at),
                  updated_at: toISOStringSafe(comment.community.updated_at),
                }
              : undefined,
            created_at: toISOStringSafe(comment.created_at),
          };
        }
      } else if (r.target_type === "community") {
        const comm = await MyGlobal.prisma.community_bbs_communities.findUnique(
          {
            where: { id: r.target_id },
            include: {
              creator: {
                select: {
                  id: true,
                  username: true,
                  display_name: true,
                  karma: true,
                  created_at: true,
                  updated_at: true,
                },
              },
              community_bbs_community_settings: true,
            },
          },
        );
        if (comm) {
          target = {
            id: comm.id,
            name: comm.name,
            slug: comm.slug,
            description: comm.description ?? null,
            creator: comm.creator
              ? {
                  id: comm.creator.id,
                  username: comm.creator.username,
                  display_name: comm.creator.display_name ?? null,
                  karma: comm.creator.karma,
                  created_at: toISOStringSafe(comm.creator.created_at),
                  updated_at: toISOStringSafe(comm.creator.updated_at),
                }
              : undefined,
            visibility: comm.visibility,
            post_approval_required: comm.post_approval_required,
            members_count: comm.members_count,
            posts_count: comm.posts_count,
            community_settings: comm.community_bbs_community_settings
              ? {
                  id: comm.community_bbs_community_settings.id,
                  community_id:
                    comm.community_bbs_community_settings.community_id,
                  visibility:
                    comm.community_bbs_community_settings.visibility ??
                    undefined,
                  require_post_approval:
                    comm.community_bbs_community_settings
                      .require_post_approval ?? undefined,
                  max_images_per_post:
                    comm.community_bbs_community_settings.max_images_per_post ??
                    null,
                  allowed_image_mime_types: comm
                    .community_bbs_community_settings.allowed_image_mime_types
                    ? comm.community_bbs_community_settings.allowed_image_mime_types.split(
                        ",",
                      )
                    : undefined,
                  created_at: toISOStringSafe(
                    comm.community_bbs_community_settings.created_at,
                  ),
                  updated_at: toISOStringSafe(
                    comm.community_bbs_community_settings.updated_at,
                  ),
                  deleted_at: comm.community_bbs_community_settings.deleted_at
                    ? toISOStringSafe(
                        comm.community_bbs_community_settings.deleted_at,
                      )
                    : null,
                }
              : undefined,
            created_at: toISOStringSafe(comm.created_at),
            updated_at: toISOStringSafe(comm.updated_at),
            deleted_at: comm.deleted_at
              ? toISOStringSafe(comm.deleted_at)
              : null,
          };
        }
      } else if (r.target_type === "user") {
        const user =
          await MyGlobal.prisma.community_bbs_communitymember.findUnique({
            where: { id: r.target_id },
            select: {
              id: true,
              username: true,
              display_name: true,
              karma: true,
              created_at: true,
              updated_at: true,
            },
          });
        if (user) {
          target = {
            id: user.id,
            username: user.username,
            display_name: user.display_name ?? null,
            karma: user.karma,
            created_at: toISOStringSafe(user.created_at),
            updated_at: toISOStringSafe(user.updated_at),
          };
        }
      }

      const summary: ICommunityBbsReport.ISummary = {
        id: r.id,
        reporter: reporterSummary,
        target_type: typia.assert<"community" | "post" | "comment" | "user">(
          r.target_type as any,
        ),
        // target is polymorphic; assign the object or leave undefined if not found
        target: target as any,
        reason_code: r.reason_code,
        priority: r.priority,
        status: r.status,
        evidence_count: r.evidence_count,
        created_at: toISOStringSafe(r.created_at),
        updated_at: toISOStringSafe(r.updated_at),
        resolved_at: r.resolved_at ? toISOStringSafe(r.resolved_at) : null,
      };

      return summary;
    }),
  );

  return {
    pagination: {
      current: Number(page),
      limit: Number(take),
      records: total,
      pages: Math.ceil(total / take),
    },
    data,
  };
}
