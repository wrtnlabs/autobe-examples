import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityFlair } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFlair";
import { ICommunityPlatformCommunityFlairAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFlairAssignment";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformCommunityFlairAtSummaryTransformer } from "./CommunityPlatformCommunityFlairAtSummaryTransformer";
import { CommunityPlatformUserAtSummaryTransformer } from "./CommunityPlatformUserAtSummaryTransformer";

export namespace CommunityPlatformCommunityFlairAssignmentAtFlairAssignmentSummaryTransformer {
  export type Payload =
    Prisma.community_platform_community_flair_assignmentsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        expired_at: true,
        updated_at: true,
        deleted_at: true,
        user: CommunityPlatformUserAtSummaryTransformer.select(),
        flair: CommunityPlatformCommunityFlairAtSummaryTransformer.select(),
        assignedBy: CommunityPlatformUserAtSummaryTransformer.select(),
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_community_flair_assignmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommunityFlairAssignment.IFlairAssignmentSummary> {
    return {
      id: input.id,
      user: await CommunityPlatformUserAtSummaryTransformer.transform(
        input.user,
      ),
      flair:
        await CommunityPlatformCommunityFlairAtSummaryTransformer.transform(
          input.flair,
        ),
      assigned_by: await CommunityPlatformUserAtSummaryTransformer.transform(
        input.assignedBy,
      ),
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at ? input.expired_at.toISOString() : null,
    };
  }
}
