import { ICommunityPlatformModeratorAssignmentPrivilege } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorAssignmentPrivilege";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformModeratorAssignmentPrivilegeCollector {
  export async function collect(props: {
    body: ICommunityPlatformModeratorAssignmentPrivilege.ICreate;
    moderatorAssignment: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      privilege_type: props.body.privilege_type,
      granted_at: new Date(),
      revoked_at: null,
      deleted_at: null,
      // BelongsTo relation
      moderatorAssignment: { connect: { id: props.moderatorAssignment.id } },
    } satisfies Prisma.community_platform_moderator_assignment_privilegesCreateInput;
  }
}
