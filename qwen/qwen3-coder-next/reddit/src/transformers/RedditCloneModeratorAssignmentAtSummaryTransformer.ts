import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { IRedditCloneModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorAssignment";
import { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneCommunityAtSummaryTransformer } from "./RedditCloneCommunityAtSummaryTransformer";
import { RedditCloneModeratorAtSummaryTransformer } from "./RedditCloneModeratorAtSummaryTransformer";

export namespace RedditCloneModeratorAssignmentAtSummaryTransformer {
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
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            icon_url: true,
            subscriber_count: true,
            created_at: true,
            updated_at: true,
            owner: {
              select: {
                id: true,
                username: true,
                display_name: true,
                avatar_url: true,
              },
            } satisfies Prisma.reddit_clone_ownersFindFirstArgs,
          },
        } satisfies Prisma.reddit_clone_communitiesFindFirstArgs,
        appointedActor: {
          select: {
            id: true,
            email: true,
            username: true,
            display_name: true,
            bio: true,
            avatar_url: true,
            role_type: true,
            permissions: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            last_login_at: true,
          },
        } satisfies Prisma.reddit_clone_moderatorsFindFirstArgs,
      },
    } satisfies Prisma.reddit_clone_moderator_assignmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneModeratorAssignment.ISummary> {
    return {
      id: input.id,
      role: input.role,
      assignedAt: input.assigned_at.toISOString(),
      status: input.status,
      community: await RedditCloneCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      moderator: await RedditCloneModeratorAtSummaryTransformer.transform(
        input.appointedActor,
      ),
    };
  }
}
