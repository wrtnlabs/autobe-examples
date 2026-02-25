import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorAssignment";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformUserAtSummaryTransformer } from "./CommunityPlatformUserAtSummaryTransformer";

export namespace CommunityPlatformModeratorAssignmentAtSummaryTransformer {
  export type Payload =
    Prisma.community_platform_moderator_assignmentsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        notes: true,
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        assignedUser: CommunityPlatformUserAtSummaryTransformer.select(),
        assignedBy: CommunityPlatformUserAtSummaryTransformer.select(),
        assignmentPrivileges: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_moderator_assignment_privilegesFindManyArgs,
      },
    } satisfies Prisma.community_platform_moderator_assignmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformModeratorAssignment.ISummary> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      assignedUser: await CommunityPlatformUserAtSummaryTransformer.transform(
        input.assignedUser,
      ),
      assignedBy: await CommunityPlatformUserAtSummaryTransformer.transform(
        input.assignedBy,
      ),
    };
  }
}
