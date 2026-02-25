import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationAppeal";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneModerationAppealTransformer {
  export type Payload = Prisma.reddit_clone_moderation_appealsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        appeal_content: true,
        status: true,
        decision_reason: true,
        resolved_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        report_id: true,
        user_id: true,
        resolved_by_id: true,
        report: {
          select: { id: true },
        },
        user: {
          select: { id: true },
        },
        resolvedBy: {
          select: { id: true },
        },
      },
    } satisfies Prisma.reddit_clone_moderation_appealsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneModerationAppeal> {
    return {
      id: input.id,
      report_id: input.report_id,
      user_id: input.user_id,
      resolved_by_id: input.resolved_by_id ?? undefined,
      appeal_content: input.appeal_content,
      status: input.status as "pending" | "approved" | "denied",
      decision_reason: input.decision_reason ?? undefined,
      resolved_at: toISOStringSafe(input.resolved_at ?? new Date()),
      created_at: toISOStringSafe(input.created_at ?? new Date()),
      updated_at: toISOStringSafe(input.updated_at ?? new Date()),
      deleted_at: toISOStringSafe(input.deleted_at ?? new Date()),
    };
  }
}
