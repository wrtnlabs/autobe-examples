import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationAppeal";
import { IRedditCloneModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationReport";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneModerationAppealAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_moderation_appealsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        appeal_content: true,
        status: true,
        resolved_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: {
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar_url: true,
          },
        } satisfies Prisma.reddit_clone_membersFindManyArgs,
        resolvedBy: {
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar_url: true,
          },
        } satisfies Prisma.reddit_clone_membersFindManyArgs,
        report: {
          select: {
            id: true,
            reporter: {
              select: {
                id: true,
                username: true,
                display_name: true,
                avatar_url: true,
              },
            } satisfies Prisma.reddit_clone_membersFindManyArgs,
            reason_text: true,
            status: true,
            created_at: true,
            resolved_at: true,
          },
        } satisfies Prisma.reddit_clone_moderation_reportsFindManyArgs,
      },
    } satisfies Prisma.reddit_clone_moderation_appealsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneModerationAppeal.ISummary> {
    return {
      id: input.id,
      appealContent: input.appeal_content,
      status: input.status,
      resolvedAt: input.resolved_at ? toISOStringSafe(input.resolved_at) : null,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      reporter: {
        id: input.user.id,
        username: input.user.username,
        displayName: input.user.display_name ?? undefined,
        avatarUrl: input.user.avatar_url ?? undefined,
      },
      resolvedBy: input.resolvedBy
        ? {
            id: input.resolvedBy.id,
            username: input.resolvedBy.username,
            displayName: input.resolvedBy.display_name ?? undefined,
            avatarUrl: input.resolvedBy.avatar_url ?? undefined,
          }
        : null,
      report: {
        id: input.report.id,
        reporter: {
          id: input.report.reporter.id,
          username: input.report.reporter.username,
          displayName: input.report.reporter.display_name ?? undefined,
          avatarUrl: input.report.reporter.avatar_url ?? undefined,
        },
        content: {
          type: "comment",
          id:
            (input.report as any).content_comment_id ??
            (input.report as any).content_post_id ??
            "00000000-0000-0000-0000-000000000000",
          titleOrContent: "",
        },
        reason: input.report.reason_text ?? undefined,
        status: input.report.status,
        created_at: toISOStringSafe(input.report.created_at),
        resolved_at: input.report.resolved_at
          ? toISOStringSafe(input.report.resolved_at)
          : null,
      },
    };
  }
}
