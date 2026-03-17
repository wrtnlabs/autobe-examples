import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformCommunityModeratorCollector {
  export async function collect(props: {
    body: ICommunityPlatformCommunityModerator.ICreate;
    community: IEntity;
    grantedByMember: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    const member =
      await MyGlobal.prisma.community_platform_members.findFirstOrThrow({
        where: {
          code: props.body.member_code,
        },
      });
    const existing =
      await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_platform_community_id: props.community.id,
          community_platform_member_id: member.id,
        },
      });
    if (existing !== null)
      throw new Error(
        "A moderator assignment already exists for this community and member.",
      );
    return {
      id,
      role: "moderator",
      status: "active",
      granted_at: now,
      revoked_at: null,
      revocation_reason: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      community: {
        connect: {
          id: props.community.id,
        },
      },
      member: {
        connect: {
          id: member.id,
        },
      },
      grantedByMember: {
        connect: {
          id: props.grantedByMember.id,
        },
      },
      revokedByMember: undefined,
    } satisfies Prisma.community_platform_community_moderatorsCreateInput;
  }
}
