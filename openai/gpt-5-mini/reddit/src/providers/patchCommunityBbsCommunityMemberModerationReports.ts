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

export async function patchCommunityBbsCommunityMemberModerationReports(props: {
  communityMember: CommunitymemberPayload;
  body: ICommunityBbsReport.IRequest;
}): Promise<IPageICommunityBbsReport.ISummary> {
  const { communityMember, body } = props;

  // 1) Verify moderator assignments
  const moderatorRows =
    await MyGlobal.prisma.community_bbs_community_moderators.findMany({
      where: {
        community_member_id: communityMember.id,
        active: true,
      },
      select: { community_id: true },
    });

  const moderatedCommunityIds = moderatorRows.map((r) => r.community_id);
  if (moderatedCommunityIds.length === 0) {
    throw new HttpException(
      "Unauthorized: You are not a moderator of any communities.",
      403,
    );
  }

  // 2) If client requested a specific community, resolve slug -> id and ensure authorization
  let requestedCommunityId: string | null = null;
  if (body.community_slug !== undefined && body.community_slug !== null) {
    const community = await MyGlobal.prisma.community_bbs_communities.findFirst(
      {
        where: { slug: body.community_slug },
        select: { id: true },
      },
    );
    if (!community) throw new HttpException("Not Found: community", 404);
    requestedCommunityId = community.id;
    if (!moderatedCommunityIds.includes(requestedCommunityId)) {
      throw new HttpException(
        "Unauthorized: You are not a moderator for the requested community",
        403,
      );
    }
  }
  if (body.community_id !== undefined && body.community_id !== null) {
    requestedCommunityId = body.community_id;
    if (!moderatedCommunityIds.includes(requestedCommunityId)) {
      throw new HttpException(
        "Unauthorized: You are not a moderator for the requested community",
        403,
      );
    }
  }

  // 3) Gather allowed post/comment ids that belong to moderated communities
  const [postRows, commentRows] = await Promise.all([
    MyGlobal.prisma.community_bbs_posts.findMany({
      where: { community_bbs_community_id: { in: moderatedCommunityIds } },
      select: { id: true },
    }),
    MyGlobal.prisma.community_bbs_comments.findMany({
      where: { community_bbs_community_id: { in: moderatedCommunityIds } },
      select: { id: true },
    }),
  ]);

  const allowedPostIds = postRows.map((p) => p.id);
  const allowedCommentIds = commentRows.map((c) => c.id);

  // 4) Build base where conditions from filters (null vs undefined handled explicitly)
  const whereBase: Record<string, unknown> = {};
  if (body.status !== undefined && body.status !== null)
    whereBase.status = body.status;
  if (body.priority !== undefined && body.priority !== null)
    whereBase.priority = body.priority;
  // reason_code may not exist on IRequest - access via any to avoid TS property error
  if (
    (body as any).reason_code !== undefined &&
    (body as any).reason_code !== null
  )
    whereBase.reason_code = (body as any).reason_code;
  if (body.target_type !== undefined && body.target_type !== null)
    whereBase.target_type = body.target_type;
  if (
    body.handled_by_actor_type !== undefined &&
    body.handled_by_actor_type !== null
  )
    whereBase.handled_by_actor_type = body.handled_by_actor_type;
  if (
    body.handled_by_actor_id !== undefined &&
    body.handled_by_actor_id !== null
  )
    whereBase.handled_by_actor_id = body.handled_by_actor_id;

  if (body.reporter_present !== undefined && body.reporter_present !== null) {
    if (body.reporter_present === true) whereBase.reporter_id = { not: null };
    else whereBase.reporter_id = null;
  }

  if (body.text_query !== undefined && body.text_query !== null)
    whereBase.explanation = { contains: body.text_query };

  if (body.created_at_from !== undefined && body.created_at_from !== null) {
    whereBase.created_at = {
      ...((whereBase.created_at as Record<string, unknown>) ?? {}),
      gte: body.created_at_from,
    };
  }
  if (body.created_at_to !== undefined && body.created_at_to !== null) {
    whereBase.created_at = {
      ...((whereBase.created_at as Record<string, unknown>) ?? {}),
      lte: body.created_at_to,
    };
  }
  if (body.updated_at_from !== undefined && body.updated_at_from !== null) {
    whereBase.updated_at = {
      ...((whereBase.updated_at as Record<string, unknown>) ?? {}),
      gte: body.updated_at_from,
    };
  }
  if (body.updated_at_to !== undefined && body.updated_at_to !== null) {
    whereBase.updated_at = {
      ...((whereBase.updated_at as Record<string, unknown>) ?? {}),
      lte: body.updated_at_to,
    };
  }
  if (body.resolved_at_from !== undefined && body.resolved_at_from !== null) {
    whereBase.resolved_at = {
      ...((whereBase.resolved_at as Record<string, unknown>) ?? {}),
      gte: body.resolved_at_from,
    };
  }
  if (body.resolved_at_to !== undefined && body.resolved_at_to !== null) {
    whereBase.resolved_at = {
      ...((whereBase.resolved_at as Record<string, unknown>) ?? {}),
      lte: body.resolved_at_to,
    };
  }

  // 5) Moderator scoping: build OR branches for allowed targets
  const scopeOr: Record<string, unknown>[] = [];
  if (allowedPostIds.length)
    scopeOr.push({ target_type: "post", target_id: { in: allowedPostIds } });
  if (allowedCommentIds.length)
    scopeOr.push({
      target_type: "comment",
      target_id: { in: allowedCommentIds },
    });
  scopeOr.push({
    target_type: "community",
    target_id: { in: moderatedCommunityIds },
  });

  // If a single community was requested, restrict scope to that community only
  let finalWhere: Record<string, unknown>;
  if (requestedCommunityId !== null) {
    const specificOr: Record<string, unknown>[] = [];
    specificOr.push({
      target_type: "community",
      target_id: requestedCommunityId,
    });
    if (allowedPostIds.length)
      specificOr.push({
        target_type: "post",
        target_id: { in: allowedPostIds },
      });
    if (allowedCommentIds.length)
      specificOr.push({
        target_type: "comment",
        target_id: { in: allowedCommentIds },
      });
    finalWhere = { AND: [whereBase, { OR: specificOr }] };
  } else {
    finalWhere = { AND: [whereBase, { OR: scopeOr }] };
  }

  // 6) Pagination and ordering
  const limit = Number(body.limit ?? 25);
  const page = Number(body.page ?? 1);
  const skip = Math.max(0, (page - 1) * limit);

  const orderBy = (
    body.sort_by === "priority"
      ? ({ priority: body.sort_order === "asc" ? "asc" : "desc" } as const)
      : body.sort_by === "status"
        ? ({ status: body.sort_order === "asc" ? "asc" : "desc" } as const)
        : ({ created_at: body.sort_order === "asc" ? "asc" : "desc" } as const)
  ) satisfies Prisma.community_bbs_reportsOrderByWithRelationInput;

  // 7) Fetch reports and total count
  const [reports, total] = await Promise.all([
    MyGlobal.prisma.community_bbs_reports.findMany({
      where: finalWhere,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        reporter_id: true,
        target_type: true,
        target_id: true,
        reason_code: true,
        evidence_count: true,
        priority: true,
        status: true,
        created_at: true,
        updated_at: true,
        resolved_at: true,
      },
    }),
    MyGlobal.prisma.community_bbs_reports.count({ where: finalWhere }),
  ]);

  // 8) Batch fetch referenced entities for summaries
  const reporterIds = Array.from(
    new Set(
      reports
        .map((r) => r.reporter_id)
        .filter(
          (v): v is string =>
            v !== null && v !== undefined && typeof v === "string",
        ),
    ),
  );
  const postTargetIds = Array.from(
    new Set(
      reports
        .filter((r) => r.target_type === "post")
        .map((r) => r.target_id)
        .filter(
          (v): v is string =>
            v !== null && v !== undefined && typeof v === "string",
        ),
    ),
  );
  const commentTargetIds = Array.from(
    new Set(
      reports
        .filter((r) => r.target_type === "comment")
        .map((r) => r.target_id)
        .filter(
          (v): v is string =>
            v !== null && v !== undefined && typeof v === "string",
        ),
    ),
  );
  const communityTargetIds = Array.from(
    new Set(
      reports
        .filter((r) => r.target_type === "community")
        .map((r) => r.target_id)
        .filter(
          (v): v is string =>
            v !== null && v !== undefined && typeof v === "string",
        ),
    ),
  );

  const [members, posts, comments, communities] = await Promise.all([
    reporterIds.length
      ? MyGlobal.prisma.community_bbs_communitymember.findMany({
          where: { id: { in: reporterIds } },
          select: {
            id: true,
            username: true,
            display_name: true,
            karma: true,
            created_at: true,
            updated_at: true,
          },
        })
      : Promise.resolve([]),
    postTargetIds.length
      ? MyGlobal.prisma.community_bbs_posts.findMany({
          where: { id: { in: postTargetIds } },
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
              },
            },
          },
        })
      : Promise.resolve([]),
    commentTargetIds.length
      ? MyGlobal.prisma.community_bbs_comments.findMany({
          where: { id: { in: commentTargetIds } },
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
              },
            },
          },
        })
      : Promise.resolve([]),
    communityTargetIds.length
      ? MyGlobal.prisma.community_bbs_communities.findMany({
          where: { id: { in: communityTargetIds } },
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
          },
        })
      : Promise.resolve([]),
  ]);

  // Build maps
  const memberMap = new Map(members.map((m) => [m.id, m]));
  const postMap = new Map(posts.map((p) => [p.id, p]));
  const commentMap = new Map(comments.map((c) => [c.id, c]));
  const communityMap = new Map(communities.map((c) => [c.id, c]));

  // Helper builders
  const buildReporter = (report: (typeof reports)[number]) => {
    if (!report.reporter_id) return null;
    const m = memberMap.get(report.reporter_id);
    if (!m) return null;
    return {
      id: m.id,
      username: m.username,
      display_name: m.display_name ?? undefined,
      karma: Number(m.karma),
      created_at: toISOStringSafe(m.created_at),
      updated_at: toISOStringSafe(m.updated_at),
    } satisfies ICommunityBbsCommunityMember.ISummary;
  };

  const buildPostSummary = (p: any) => ({
    id: p.id,
    title: p.title,
    post_type: p.post_type,
    score: Number(p.score),
    upvotes: Number(p.upvotes),
    downvotes: Number(p.downvotes),
    comment_count: Number(p.comment_count),
    published_at: p.published_at ? toISOStringSafe(p.published_at) : null,
    is_published: Boolean(p.is_published),
    created_at: toISOStringSafe(p.created_at),
    updated_at: toISOStringSafe(p.updated_at),
    author: {
      id: p.author.id,
      username: p.author.username,
      display_name: p.author.display_name ?? undefined,
      karma: Number(p.author.karma),
      created_at: toISOStringSafe(p.author.created_at),
      updated_at: toISOStringSafe(p.author.updated_at),
    },
    community: {
      id: p.community.id,
      name: p.community.name,
      slug: p.community.slug,
      description: p.community.description ?? undefined,
      creator: undefined,
      visibility: p.community.visibility,
      post_approval_required: Boolean(p.community.post_approval_required),
      members_count: Number(p.community.members_count),
      posts_count: Number(p.community.posts_count),
      community_settings: undefined,
      created_at: toISOStringSafe(p.community.created_at),
      updated_at: toISOStringSafe(p.community.updated_at),
      deleted_at: p.community.deleted_at
        ? toISOStringSafe(p.community.deleted_at)
        : null,
    },
  });

  const buildCommentSummary = (c: any) => ({
    id: c.id,
    body_snippet: String(c.body).slice(0, 200),
    author: {
      id: c.author.id,
      username: c.author.username,
      display_name: c.author.display_name ?? undefined,
      karma: Number(c.author.karma),
      created_at: toISOStringSafe(c.author.created_at),
      updated_at: toISOStringSafe(c.author.updated_at),
    },
    community: {
      id: c.community.id,
      name: c.community.name,
      slug: c.community.slug,
      description: c.community.description ?? undefined,
      creator: undefined,
      visibility: c.community.visibility,
      post_approval_required: Boolean(c.community.post_approval_required),
      members_count: Number(c.community.members_count),
      posts_count: Number(c.community.posts_count),
      community_settings: undefined,
      created_at: toISOStringSafe(c.community.created_at),
      updated_at: toISOStringSafe(c.community.updated_at),
      deleted_at: c.community.deleted_at
        ? toISOStringSafe(c.community.deleted_at)
        : null,
    },
    parent_id: c.community_bbs_parent_id ?? null,
    score: Number(c.score),
    upvotes: Number(c.upvotes),
    downvotes: Number(c.downvotes),
    created_at: toISOStringSafe(c.created_at),
  });

  // 9) Map reports to summaries
  const data = reports.map((r) => {
    const reporter = buildReporter(r);
    let target: unknown;
    if (r.target_type === "post") {
      const p = postMap.get(r.target_id);
      target = p ? buildPostSummary(p) : undefined;
    } else if (r.target_type === "comment") {
      const c = commentMap.get(r.target_id);
      target = c ? buildCommentSummary(c) : undefined;
    } else if (r.target_type === "community") {
      const cm = communityMap.get(r.target_id);
      target = cm
        ? {
            id: cm.id,
            name: cm.name,
            slug: cm.slug,
            description: cm.description ?? undefined,
            creator: undefined,
            visibility: cm.visibility,
            post_approval_required: Boolean(cm.post_approval_required),
            members_count: Number(cm.members_count),
            posts_count: Number(cm.posts_count),
            community_settings: undefined,
            created_at: toISOStringSafe(cm.created_at),
            updated_at: toISOStringSafe(cm.updated_at),
            deleted_at: cm.deleted_at ? toISOStringSafe(cm.deleted_at) : null,
          }
        : undefined;
    }

    // Ensure target_type is narrowed to the expected literal union using typia.assert
    const typedTargetType = typia.assert<
      "community" | "post" | "comment" | "user"
    >(r.target_type as unknown as string);

    return {
      id: r.id,
      reporter: reporter ?? null,
      target_type: typedTargetType,
      target: (target as any) ?? null,
      reason_code: r.reason_code,
      priority: r.priority,
      status: r.status,
      evidence_count: Number(r.evidence_count),
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
      resolved_at: r.resolved_at ? toISOStringSafe(r.resolved_at) : null,
    } satisfies ICommunityBbsReport.ISummary;
  });

  const pages = limit > 0 ? Math.ceil(total / limit) : 0;

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages,
    },
    data,
  } satisfies IPageICommunityBbsReport.ISummary;
}
