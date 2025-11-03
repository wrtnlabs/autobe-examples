import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsVoteReconciliation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsVoteReconciliation";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

export async function patchCommunityBbsSystemAdminVotesReconciliation(props: {
  systemAdmin: SystemadminPayload;
  body: ICommunityBbsVoteReconciliation.IRequest;
}): Promise<ICommunityBbsVoteReconciliation> {
  const { systemAdmin, body } = props;
  const now = toISOStringSafe(new Date());

  const mapRow = (row: any): ICommunityBbsVoteReconciliation => {
    return {
      id: row.id as string & tags.Format<"uuid">,
      target_type: row.target_type as "post" | "comment",
      target_id: row.target_id as string & tags.Format<"uuid">,
      observed_count: row.observed_count as number & tags.Type<"int32">,
      expected_count: row.expected_count as number & tags.Type<"int32">,
      discrepancy: row.discrepancy as number & tags.Type<"int32">,
      reconciled: !!row.reconciled,
      reconciled_at: row.reconciled_at
        ? toISOStringSafe(row.reconciled_at)
        : null,
      job_id: row.job_id ?? undefined,
      source: row.source ?? null,
      created_at: toISOStringSafe(row.created_at),
      note: row.note ?? null,
    };
  };

  // Idempotency: check existing job
  const jobId = (body as any).jobId ?? null;
  if (jobId) {
    const existing =
      await MyGlobal.prisma.community_bbs_vote_reconciliation.findFirst({
        where: { job_id: jobId },
      });
    if (existing) {
      if (!existing.reconciled)
        throw new HttpException("Conflict: job is already running", 409);
      return mapRow(existing);
    }
  }

  // Helper to build date range condition
  const buildDateRange = () => {
    const start = (body as any).startDate ?? undefined;
    const end = (body as any).endDate ?? undefined;
    if (start && end) return { gte: start, lte: end };
    if (start) return { gte: start };
    if (end) return { lte: end };
    return undefined;
  };

  // Single post
  if (body.targetType === "post") {
    const targetId = (body as ICommunityBbsVoteReconciliation.IRequest.IPost)
      .targetId;
    const post = await MyGlobal.prisma.community_bbs_posts.findUnique({
      where: { id: targetId },
    });
    if (!post) throw new HttpException("Post not found", 400);

    const createdAtRange = buildDateRange();
    const where: any = { community_bbs_post_id: targetId, deleted_at: null };
    if (createdAtRange) where.created_at = createdAtRange;

    const observed = await MyGlobal.prisma.community_bbs_post_votes.count({
      where,
    });
    const expected = (post.upvotes ?? 0) - (post.downvotes ?? 0);
    const discrepancy = observed - expected;

    const created =
      await MyGlobal.prisma.community_bbs_vote_reconciliation.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          target_type: "post",
          target_id: targetId,
          observed_count: observed,
          expected_count: expected,
          discrepancy,
          reconciled: discrepancy === 0,
          reconciled_at: discrepancy === 0 ? now : null,
          job_id: jobId ?? null,
          source: "systemadmin:votes.reconciliation",
          created_at: now,
          note: null,
        },
      });

    await MyGlobal.prisma.community_bbs_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        actor_type: "system_admin",
        actor_id: systemAdmin.id,
        entity: "vote_reconciliation",
        action: "run",
        payload: JSON.stringify({
          targetType: "post",
          targetId,
          observed,
          expected,
          discrepancy,
          jobId,
        }),
        ip: null,
        created_at: now,
        updated_at: now,
      },
    });

    return mapRow(created);
  }

  // Single comment
  if (body.targetType === "comment") {
    const targetId = (body as ICommunityBbsVoteReconciliation.IRequest.IComment)
      .targetId;
    const comment = await MyGlobal.prisma.community_bbs_comments.findUnique({
      where: { id: targetId },
    });
    if (!comment) throw new HttpException("Comment not found", 400);

    const createdAtRange = buildDateRange();
    const where: any = { community_bbs_comment_id: targetId, deleted_at: null };
    if (createdAtRange) where.created_at = createdAtRange;

    const observed = await MyGlobal.prisma.community_bbs_comment_votes.count({
      where,
    });
    const expected = (comment.upvotes ?? 0) - (comment.downvotes ?? 0);
    const discrepancy = observed - expected;

    const created =
      await MyGlobal.prisma.community_bbs_vote_reconciliation.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          target_type: "comment",
          target_id: targetId,
          observed_count: observed,
          expected_count: expected,
          discrepancy,
          reconciled: discrepancy === 0,
          reconciled_at: discrepancy === 0 ? now : null,
          job_id: jobId ?? null,
          source: "systemadmin:votes.reconciliation",
          created_at: now,
          note: null,
        },
      });

    await MyGlobal.prisma.community_bbs_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        actor_type: "system_admin",
        actor_id: systemAdmin.id,
        entity: "vote_reconciliation",
        action: "run",
        payload: JSON.stringify({
          targetType: "comment",
          targetId,
          observed,
          expected,
          discrepancy,
          jobId,
        }),
        ip: null,
        created_at: now,
        updated_at: now,
      },
    });

    return mapRow(created);
  }

  // Full-system or community-scoped run
  if (body.targetType === "all") {
    const bodyAll = body as ICommunityBbsVoteReconciliation.IRequest.IAll;
    const communityId = bodyAll.communityId ?? null;
    if (communityId) {
      const community =
        await MyGlobal.prisma.community_bbs_communities.findUnique({
          where: { id: communityId },
        });
      if (!community || community.deleted_at !== null)
        throw new HttpException("Community not found or inactive", 400);
    }

    const posts = await MyGlobal.prisma.community_bbs_posts.findMany({
      where: communityId ? { community_bbs_community_id: communityId } : {},
      select: { id: true },
      take: 1000,
    });

    if (posts.length >= 1000) {
      await MyGlobal.prisma.community_bbs_audit_logs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          actor_type: "system_admin",
          actor_id: systemAdmin.id,
          entity: "vote_reconciliation",
          action: "run_partial",
          payload: JSON.stringify({
            message: "Limit reached",
            inspected: posts.length,
            jobId,
          }),
          ip: null,
          created_at: now,
          updated_at: now,
        },
      });
      throw new HttpException(
        "Reconciliation aborted: too many targets (partial results saved)",
        503,
      );
    }

    let totalInspected = 0;
    let totalDiscrepancies = 0;

    for (const p of posts) {
      totalInspected += 1;
      const observed = await MyGlobal.prisma.community_bbs_post_votes.count({
        where: { community_bbs_post_id: p.id, deleted_at: null },
      });
      const post = await MyGlobal.prisma.community_bbs_posts.findUnique({
        where: { id: p.id },
        select: { upvotes: true, downvotes: true },
      });
      const expected = (post?.upvotes ?? 0) - (post?.downvotes ?? 0);
      const discrepancy = observed - expected;
      if (discrepancy !== 0) {
        totalDiscrepancies += 1;
        await MyGlobal.prisma.community_bbs_vote_reconciliation.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            target_type: "post",
            target_id: p.id,
            observed_count: observed,
            expected_count: expected,
            discrepancy,
            reconciled: false,
            reconciled_at: null,
            job_id: jobId ?? null,
            source: "systemadmin:votes.reconciliation",
            created_at: now,
            note: null,
          },
        });
      }
    }

    const summaryId = v4() as string & tags.Format<"uuid">;
    const summary =
      await MyGlobal.prisma.community_bbs_vote_reconciliation.create({
        data: {
          id: summaryId,
          target_type: "post",
          target_id: (communityId ?? summaryId) as string,
          observed_count: totalInspected,
          expected_count: totalDiscrepancies,
          discrepancy: totalDiscrepancies,
          reconciled: totalDiscrepancies === 0,
          reconciled_at: totalDiscrepancies === 0 ? now : null,
          job_id: jobId ?? null,
          source: "systemadmin:votes.reconciliation",
          created_at: now,
          note: "summary",
        },
      });

    await MyGlobal.prisma.community_bbs_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        actor_type: "system_admin",
        actor_id: systemAdmin.id,
        entity: "vote_reconciliation",
        action: "run",
        payload: JSON.stringify({
          scope: "all",
          inspected: totalInspected,
          discrepancies: totalDiscrepancies,
          jobId,
        }),
        ip: null,
        created_at: now,
        updated_at: now,
      },
    });

    return mapRow(summary);
  }

  throw new HttpException("Invalid targetType", 400);
}
