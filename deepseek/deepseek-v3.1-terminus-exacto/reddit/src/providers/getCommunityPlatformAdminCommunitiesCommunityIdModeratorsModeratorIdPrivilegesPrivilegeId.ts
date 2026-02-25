import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorAssignment";
import { ICommunityPlatformModeratorAssignmentPrivilege } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorAssignmentPrivilege";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformModeratorAssignmentPrivilegeTransformer } from "../transformers/CommunityPlatformModeratorAssignmentPrivilegeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminCommunitiesCommunityIdModeratorsModeratorIdPrivilegesPrivilegeId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
  privilegeId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformModeratorAssignmentPrivilege> {
  // Validate hierarchical authorization
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId },
  });
  // Validate moderator assignment belongs to community
  const moderatorAssignment =
    await MyGlobal.prisma.community_platform_moderator_assignments.findUniqueOrThrow(
      {
        where: {
          id: props.moderatorId,
          community_id: props.communityId,
        },
      },
    );
  // Retrieve the specific privilege assignment
  const privilege =
    await MyGlobal.prisma.community_platform_moderator_assignment_privileges.findUniqueOrThrow(
      {
        where: {
          id: props.privilegeId,
          community_platform_moderator_assignment_id: props.moderatorId,
        },
        ...CommunityPlatformModeratorAssignmentPrivilegeTransformer.select(),
      },
    );
  // Verify hierarchy and return transformed result
  return CommunityPlatformModeratorAssignmentPrivilegeTransformer.transform(
    privilege,
  );
}
