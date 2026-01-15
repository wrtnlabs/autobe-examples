import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardCitizenViolation } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCitizenViolation";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardCitizenViolationAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_citizen_violationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        summary: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        citizen: {
          select: {
            id: true,
          },
        },
        moderationAction: {
          select: {
            moderator_id: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_citizen_violationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardCitizenViolation.ISummary> {
    // Parse the summary field which contains type:severity_level in format like "harassment:medium"
    const summaryParts = input.summary.split(":");
    const type = summaryParts[0] as
      | "harassment"
      | "spam"
      | "impersonation"
      | "copyright"
      | "hate_speech"
      | "threats"
      | "other";
    const severityLevel = summaryParts[1] as "low" | "medium" | "high";
    return {
      id: input.id,
      citizen_id: input.citizen.id,
      type: type,
      severity_level: severityLevel,
      reported_at: input.created_at.toISOString(),
      status: input.deleted_at
        ? "dismissed"
        : input.updated_at
          ? "actioned"
          : "pending_review",
      resolved_at: input.updated_at ? input.updated_at.toISOString() : null,
      moderator_id: input.moderationAction
        ? input.moderationAction.moderator_id
        : null,
      violation_details: null,
    };
  }
}
