import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorAssignment";
import { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneCommunityAtSummaryTransformer } from "./RedditCloneCommunityAtSummaryTransformer";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";

export namespace RedditCloneModeratorAssignmentTransformer {
  export type Payload = Prisma.reddit_clone_moderator_assignmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        role: true,
        assigned_at: true,
        status: true,
        revoked_at: true,
        revoked_by_id: true,
        created_at: true,
        updated_at: true,
        community: RedditCloneCommunityAtSummaryTransformer.select(),
        appointedActor: RedditCloneMemberAtSummaryTransformer.select(),
        appointingActor: RedditCloneMemberAtSummaryTransformer.select(),
        resolvedReports: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_clone_report_resolutionsFindManyArgs,
      },
    } satisfies Prisma.reddit_clone_moderator_assignmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneModeratorAssignment> {
    return {
      id: input.id,
      community: await RedditCloneCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      appointedActor: await RedditCloneMemberAtSummaryTransformer.transform(
        input.appointedActor,
      ),
      appointingActor: await RedditCloneMemberAtSummaryTransformer.transform(
        input.appointingActor,
      ),
      role: input.role,
      assignedAt: toISOStringSafe(input.assigned_at),
      status: input.status,
      revokedAt: input.revoked_at ? toISOStringSafe(input.revoked_at) : null,
      revokedBy: null,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
    };
  }
}
