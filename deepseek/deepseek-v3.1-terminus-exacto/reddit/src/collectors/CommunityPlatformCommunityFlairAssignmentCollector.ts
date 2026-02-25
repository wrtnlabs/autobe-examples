import { ICommunityPlatformCommunityFlairAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFlairAssignment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformCommunityFlairAssignmentCollector {
  export async function collect(props: {
    body: ICommunityPlatformCommunityFlairAssignment.ICreate;
    communityPlatformCommunities: IEntity; // 来自路径参数 communityId
    communityPlatformUsers: IEntity; // 来自授权角色
    communityPlatformUserSessions: IEntity; // 来自授权session（本收集器中未使用）
  }) {
    const id: string = v4();
    const now = new Date();
    return {
      id,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      expired_at: props.body.expired_at ?? null,
      user: { connect: { id: props.body.community_platform_user_id } },
      community: { connect: { id: props.communityPlatformCommunities.id } },
      flair: {
        connect: { id: props.body.community_platform_community_flair_id },
      },
      assignedBy: { connect: { id: props.communityPlatformUsers.id } },
    } satisfies Prisma.community_platform_community_flair_assignmentsCreateInput;
  }
}
