import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorAssignment";
import { ICommunityPlatformModeratorAssignmentPrivilege } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorAssignmentPrivilege";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformModeratorAssignmentAtSummaryTransformer } from "./CommunityPlatformModeratorAssignmentAtSummaryTransformer";

export namespace CommunityPlatformModeratorAssignmentPrivilegeTransformer {
  export type Payload =
    Prisma.community_platform_moderator_assignment_privilegesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        privilege_type: true,
        granted_at: true,
        revoked_at: true,
        deleted_at: true,
        moderatorAssignment:
          CommunityPlatformModeratorAssignmentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_moderator_assignment_privilegesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformModeratorAssignmentPrivilege> {
    return {
      id: input.id,
      privilege_type: input.privilege_type,
      granted_at: input.granted_at.toISOString(),
      revoked_at: input.revoked_at ? input.revoked_at.toISOString() : null,
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
      moderatorAssignment:
        await CommunityPlatformModeratorAssignmentAtSummaryTransformer.transform(
          input.moderatorAssignment,
        ),
    };
  }
}
