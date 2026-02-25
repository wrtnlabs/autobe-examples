import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationReport";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneModerationReportTransformer {
  export type Payload = Prisma.reddit_clone_moderation_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        reason_text: true,
        created_at: true,
        resolved_at: true,
        reporter: {
          select: {
            username: true,
          },
        },
        contentType: {
          select: {
            id: true,
            code: true,
          },
        },
        contentPost: {
          select: {
            title: true,
          },
        },
        contentComment: {
          select: {
            content: true,
          },
        },
        moderator: {
          select: {
            username: true,
          },
        },
        reason: {
          select: {
            id: true,
          },
        },
        appeals: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.reddit_clone_moderation_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneModerationReport> {
    return {
      id: input.id,
      reporterUsername: input.reporter.username,
      contentType: input.contentType.code === "post" ? "post" : "comment",
      contentPreview: input.contentPost
        ? input.contentPost.title
        : input.contentComment
          ? input.contentComment.content.substring(0, 200)
          : "",
      reasonText: input.reason_text ?? null,
      status: input.status as
        | "pending"
        | "resolved_approved"
        | "resolved_dismissed",
      createdAt: toISOStringSafe(input.created_at),
      resolvedAt: input.resolved_at ? toISOStringSafe(input.resolved_at) : null,
      moderatorUsername: input.moderator ? input.moderator.username : null,
    };
  }
}
