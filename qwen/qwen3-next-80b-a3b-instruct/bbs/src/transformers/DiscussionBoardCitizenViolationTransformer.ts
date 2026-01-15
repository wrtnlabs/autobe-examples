import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardCitizenViolation } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCitizenViolation";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardCitizenViolationTransformer {
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
        citizen: true,
        moderationAction: true,
      },
    } satisfies Prisma.discussion_board_citizen_violationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardCitizenViolation> {
    return {
      id: input.id,
      citizen_id: input.citizen.id,
      violation_type: input.summary,
      violation_details: "",
      violation_timestamp: toISOStringSafe(input.created_at),
      violated_at: toISOStringSafe(input.updated_at),
      status: input.deleted_at ? "resolved" : "pending",
      final_decision: "",
      severity_level: 1,
      moderator_id: input.moderationAction.id,
      content_id: typia.random<string & tags.Format<"uuid">>(),
      evidence_url: typia.random<string & tags.Format<"uri">>(),
      appeal_id: typia.random<string & tags.Format<"uuid">>(),
    };
  }
}
