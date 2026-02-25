import { ICommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityBanCollector {
  export async function collect(props: {
    body: ICommunityBan.ICreate;
    communityCommunities: IEntity;
    communityMembers: IEntity;
    communityMemberSessions: IEntity;
  }) {
    const id: string = v4();
    // Resolve the target member from username
    const targetMember =
      await MyGlobal.prisma.community_members.findFirstOrThrow({
        where: {
          username: props.body.username,
        },
      });
    return {
      id,
      reason: props.body.reason ?? null,
      expired_at: props.body.expired_at
        ? new Date(props.body.expired_at)
        : null,
      created_at: new Date(),
      updated_at: new Date(),
      community: { connect: { id: props.communityCommunities.id } },
      member: { connect: { id: targetMember.id } },
      bannedBy: { connect: { id: props.communityMembers.id } },
    } satisfies Prisma.community_bansCreateInput;
  }
}
