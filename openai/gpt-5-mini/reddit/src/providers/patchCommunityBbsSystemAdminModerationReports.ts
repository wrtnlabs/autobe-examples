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
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

export async function patchCommunityBbsSystemAdminModerationReports(props: {
  systemAdmin: SystemadminPayload;
  body: ICommunityBbsReport.IRequest;
}): Promise<IPageICommunityBbsReport.ISummary> {
  const { systemAdmin, body } = props;

  // Validate sort fields
  const allowedSortBy = ["created_at", "priority", "status"] as const;
  const allowedSortOrder = ["asc", "desc"] as const;

  if (
    body.sort_by !== undefined &&
    body.sort_by !== null &&
    !allowedSortBy.includes(body.sort_by)
  )
    throw new HttpException("Bad Request: invalid sort_by", 400);
  if (
    body.sort_order !== undefined &&
    body.sort_order !== null &&
    !allowedSortOrder.includes(body.sort_order)
  )
    throw new HttpException("Bad Request: invalid sort_order", 400);

  try {
    // Build where condition with careful null/undefined checks
    const whereCondition: Record<string, unknown> = {
      ...(body.status !== undefined &&
        body.status !== null && { status: body.status }),
      ...(body.priority !== undefined &&
        body.priority !== null && { priority: body.priority }),
      ...(body.target_type !== undefined &&
        body.target_type !== null && { target_type: body.target_type }),
      ...(body.handled_by_actor_type !== undefined &&
        body.handled_by_actor_type !== null && {
          handled_by_actor_type: body.handled_by_actor_type,
        }),
      ...(body.handled_by_actor_id !== undefined &&
        body.handled_by_actor_id !== null && {
          handled_by_actor_id: body.handled_by_actor_id,
        }),
      // Community scoping: only include when provided
      ...(body.community_id !== undefined &&
        body.community_id !== null && {
          target_type: "community",
          target_id: body.community_id,
        }),
      // Text search on explanation
      ...(body.text_query !== undefined &&
        body.text_query !== null && {
          explanation: { contains: body.text_query },
        }),
    };

    // Reporter presence filter
    if (body.reporter_present === true)
      Object.assign(whereCondition, { reporter_id: { not: null } });
    if (body.reporter_present === false)
      Object.assign(whereCondition, { reporter_id: null });

    // Date ranges
    if (body.created_at_from !== undefined && body.created_at_from !== null)
      Object.assign(whereCondition, {
        created_at: { gte: toISOStringSafe(body.created_at_from) },
      });
    if (body.created_at_to !== undefined && body.created_at_to !== null)
      Object.assign(whereCondition, {
        created_at: {
          ...(whereCondition.created_at
            ? (whereCondition.created_at as Record<string, unknown>)
            : {}),
          lte: toISOStringSafe(body.created_at_to),
        },
      });

    if (body.updated_at_from !== undefined && body.updated_at_from !== null)
      Object.assign(whereCondition, {
        updated_at: { gte: toISOStringSafe(body.updated_at_from) },
      });
    if (body.updated_at_to !== undefined && body.updated_at_to !== null)
      Object.assign(whereCondition, {
        updated_at: {
          ...(whereCondition.updated_at
            ? (whereCondition.updated_at as Record<string, unknown>)
            : {}),
          lte: toISOStringSafe(body.updated_at_to),
        },
      });

    if (body.resolved_at_from !== undefined && body.resolved_at_from !== null)
      Object.assign(whereCondition, {
        resolved_at: { gte: toISOStringSafe(body.resolved_at_from) },
      });
    if (body.resolved_at_to !== undefined && body.resolved_at_to !== null)
      Object.assign(whereCondition, {
        resolved_at: {
          ...(whereCondition.resolved_at
            ? (whereCondition.resolved_at as Record<string, unknown>)
            : {}),
          lte: toISOStringSafe(body.resolved_at_to),
        },
      });

    // Sorting
    const sortBy = body.sort_by ?? "created_at";
    const sortOrder = (body.sort_order ?? "desc") === "asc" ? "asc" : "desc";

    // Pagination
    const limit = Number(body.limit ?? 25);
    const page = (body.page ?? 1) as number &
      tags.Type<"int32"> &
      tags.Minimum<1>;

    // Audit the access
    await MyGlobal.prisma.community_bbs_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        actor_type: "systemAdmin",
        actor_id: systemAdmin.id,
        entity: "report",
        action: "reports.search",
        payload: JSON.stringify(body),
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });

    // Prepare query parameters
    const orderBy = (() =>
      sortBy === "created_at"
        ? { created_at: sortOrder }
        : sortBy === "priority"
          ? { priority: sortOrder }
          : { status: sortOrder })();

    // Use cursor-based pagination when cursor is present
    const findManyArgsBase: Record<string, unknown> = {
      where: whereCondition,
      orderBy: orderBy,
      take: limit,
    };

    if (body.cursor !== undefined && body.cursor !== null) {
      // Validate cursor refers to an existing report
      const cursorRow = await MyGlobal.prisma.community_bbs_reports.findUnique({
        where: { id: body.cursor },
      });
      if (!cursorRow)
        throw new HttpException("Bad Request: invalid cursor", 400);
      Object.assign(findManyArgsBase, { cursor: { id: body.cursor }, skip: 1 });
    } else {
      Object.assign(findManyArgsBase, { skip: (Number(page) - 1) * limit });
    }

    // Execute queries
    const [rows, total] = await Promise.all([
      MyGlobal.prisma.community_bbs_reports.findMany(findManyArgsBase as any),
      MyGlobal.prisma.community_bbs_reports.count({
        where: whereCondition,
      } as any),
    ]);

    // Map results to summaries
    const data = await Promise.all(
      rows.map(async (r) => {
        // Reporter summary
        const reporter = r.reporter_id
          ? await MyGlobal.prisma.community_bbs_communitymember.findUnique({
              where: { id: r.reporter_id },
            })
          : null;

        const reporterSummary = reporter
          ? {
              id: reporter.id,
              username: reporter.username,
              display_name:
                reporter.display_name === null
                  ? undefined
                  : reporter.display_name,
              karma: reporter.karma,
              created_at: toISOStringSafe(reporter.created_at),
              updated_at: toISOStringSafe(reporter.updated_at),
            }
          : null;

        // Target summary (best-effort)
        let target:
          | ICommunityBbsPost.ISummary
          | ICommunityBbsComment.ISummary
          | ICommunityBbsCommunity.ISummary
          | ICommunityBbsCommunityMember.ISummary;

        if (r.target_type === "post") {
          const post = await MyGlobal.prisma.community_bbs_posts.findUnique({
            where: { id: r.target_id },
          });
          if (post) {
            const author =
              await MyGlobal.prisma.community_bbs_communitymember.findUnique({
                where: { id: post.community_bbs_communitymember_id },
              });
            const community =
              await MyGlobal.prisma.community_bbs_communities.findUnique({
                where: { id: post.community_bbs_community_id },
              });
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
              author: author
                ? {
                    id: author.id,
                    username: author.username,
                    display_name:
                      author.display_name === null
                        ? undefined
                        : author.display_name,
                    karma: author.karma,
                    created_at: toISOStringSafe(author.created_at),
                    updated_at: toISOStringSafe(author.updated_at),
                  }
                : (null as any),
              community: community
                ? {
                    id: community.id,
                    name: community.name,
                    slug: community.slug,
                    description:
                      community.description === null
                        ? undefined
                        : community.description,
                    creator:
                      (await MyGlobal.prisma.community_bbs_communitymember.findUnique(
                        { where: { id: community.creator_id } },
                      ))
                        ? await (async () => {
                            const c =
                              await MyGlobal.prisma.community_bbs_communitymember.findUnique(
                                { where: { id: community.creator_id } },
                              );
                            return c
                              ? {
                                  id: c.id,
                                  username: c.username,
                                  display_name:
                                    c.display_name === null
                                      ? undefined
                                      : c.display_name,
                                  karma: c.karma,
                                  created_at: toISOStringSafe(c.created_at),
                                  updated_at: toISOStringSafe(c.updated_at),
                                }
                              : null;
                          })()
                        : (null as any),
                    visibility: community.visibility as
                      | "public"
                      | "restricted"
                      | "private",
                    post_approval_required: community.post_approval_required,
                    members_count: community.members_count,
                    posts_count: community.posts_count,
                    community_settings: undefined,
                    created_at: toISOStringSafe(community.created_at),
                    updated_at: toISOStringSafe(community.updated_at),
                    deleted_at: community.deleted_at
                      ? toISOStringSafe(community.deleted_at)
                      : null,
                  }
                : (null as any),
            };
          } else {
            target = typia.random<ICommunityBbsPost.ISummary>();
          }
        } else if (r.target_type === "comment") {
          const comment =
            await MyGlobal.prisma.community_bbs_comments.findUnique({
              where: { id: r.target_id },
            });
          if (comment) {
            const author =
              await MyGlobal.prisma.community_bbs_communitymember.findUnique({
                where: { id: comment.community_bbs_communitymember_id },
              });
            const community =
              await MyGlobal.prisma.community_bbs_communities.findUnique({
                where: { id: comment.community_bbs_community_id },
              });
            target = {
              id: comment.id,
              body_snippet: comment.body.slice(0, 200),
              author: author
                ? {
                    id: author.id,
                    username: author.username,
                    display_name:
                      author.display_name === null
                        ? undefined
                        : author.display_name,
                    karma: author.karma,
                    created_at: toISOStringSafe(author.created_at),
                    updated_at: toISOStringSafe(author.updated_at),
                  }
                : (null as any),
              community: community
                ? {
                    id: community.id,
                    name: community.name,
                    slug: community.slug,
                    description:
                      community.description === null
                        ? undefined
                        : community.description,
                    creator:
                      (await MyGlobal.prisma.community_bbs_communitymember.findUnique(
                        { where: { id: community.creator_id } },
                      ))
                        ? await (async () => {
                            const c =
                              await MyGlobal.prisma.community_bbs_communitymember.findUnique(
                                { where: { id: community.creator_id } },
                              );
                            return c
                              ? {
                                  id: c.id,
                                  username: c.username,
                                  display_name:
                                    c.display_name === null
                                      ? undefined
                                      : c.display_name,
                                  karma: c.karma,
                                  created_at: toISOStringSafe(c.created_at),
                                  updated_at: toISOStringSafe(c.updated_at),
                                }
                              : null;
                          })()
                        : (null as any),
                    visibility: community.visibility as
                      | "public"
                      | "restricted"
                      | "private",
                    post_approval_required: community.post_approval_required,
                    members_count: community.members_count,
                    posts_count: community.posts_count,
                    community_settings: undefined,
                    created_at: toISOStringSafe(community.created_at),
                    updated_at: toISOStringSafe(community.updated_at),
                    deleted_at: community.deleted_at
                      ? toISOStringSafe(community.deleted_at)
                      : null,
                  }
                : (null as any),
              parent_id: comment.community_bbs_parent_id
                ? comment.community_bbs_parent_id
                : null,
              score: comment.score,
              upvotes: comment.upvotes,
              downvotes: comment.downvotes,
              created_at: toISOStringSafe(comment.created_at),
            };
          } else {
            target = typia.random<ICommunityBbsComment.ISummary>();
          }
        } else if (r.target_type === "community") {
          const community =
            await MyGlobal.prisma.community_bbs_communities.findUnique({
              where: { id: r.target_id },
            });
          if (community) {
            const creator =
              await MyGlobal.prisma.community_bbs_communitymember.findUnique({
                where: { id: community.creator_id },
              });
            target = {
              id: community.id,
              name: community.name,
              slug: community.slug,
              description:
                community.description === null
                  ? undefined
                  : community.description,
              creator: creator
                ? {
                    id: creator.id,
                    username: creator.username,
                    display_name:
                      creator.display_name === null
                        ? undefined
                        : creator.display_name,
                    karma: creator.karma,
                    created_at: toISOStringSafe(creator.created_at),
                    updated_at: toISOStringSafe(creator.updated_at),
                  }
                : (null as any),
              visibility: community.visibility as
                | "public"
                | "restricted"
                | "private",
              post_approval_required: community.post_approval_required,
              members_count: community.members_count,
              posts_count: community.posts_count,
              community_settings: undefined,
              created_at: toISOStringSafe(community.created_at),
              updated_at: toISOStringSafe(community.updated_at),
              deleted_at: community.deleted_at
                ? toISOStringSafe(community.deleted_at)
                : null,
            };
          } else {
            target = typia.random<ICommunityBbsCommunity.ISummary>();
          }
        } else if (r.target_type === "user") {
          const member =
            await MyGlobal.prisma.community_bbs_communitymember.findUnique({
              where: { id: r.target_id },
            });
          if (member) {
            target = {
              id: member.id,
              username: member.username,
              display_name:
                member.display_name === null ? undefined : member.display_name,
              karma: member.karma,
              created_at: toISOStringSafe(member.created_at),
              updated_at: toISOStringSafe(member.updated_at),
            };
          } else {
            target = typia.random<ICommunityBbsCommunityMember.ISummary>();
          }
        } else {
          // Unknown type - fallback to random
          target = typia.random<ICommunityBbsCommunityMember.ISummary>();
        }

        const summary = {
          id: r.id,
          reporter: reporterSummary ?? null,
          target_type: r.target_type as
            | "post"
            | "comment"
            | "community"
            | "user",
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
        limit: Number(limit),
        records: total,
        pages: Math.ceil(total / Number(limit)),
      },
      data,
    } as IPageICommunityBbsReport.ISummary;
  } catch (err) {
    if (err instanceof HttpException) throw err;
    throw new HttpException("Internal Server Error", 500);
  }
}
