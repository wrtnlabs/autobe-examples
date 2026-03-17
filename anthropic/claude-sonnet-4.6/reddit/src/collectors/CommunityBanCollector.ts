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
    communityCommunities: IEntity; // from path parameter communityId
    communityMembers: IEntity; // from authorized actor
    communityMemberSessions: IEntity; // from authorized session
  }) {
    return {
      id: v4(),
      reason: props.body.reason,
      status: "active",
      lifted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      community: { connect: { id: props.communityCommunities.id } },
      bannedMember: { connect: { id: props.body.banned_member_id } },
      issuingModerator: { connect: { id: props.communityMembers.id } },
    } satisfies Prisma.community_bansCreateInput;
  }
}
