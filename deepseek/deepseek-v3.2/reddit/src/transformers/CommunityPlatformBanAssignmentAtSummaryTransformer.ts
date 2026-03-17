import { ICommunityPlatformBanAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBanAssignment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformBanAssignmentAtSummaryTransformer {
  export type Payload = Prisma.community_platform_ban_assignmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        assignment_reason_text: true,
        enforcement_notes: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.community_platform_ban_assignmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformBanAssignment.ISummary> {
    return {
      id: input.id,
      assignmentReasonText: input.assignment_reason_text ?? undefined,
      enforcementNotes: input.enforcement_notes ?? undefined,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}
