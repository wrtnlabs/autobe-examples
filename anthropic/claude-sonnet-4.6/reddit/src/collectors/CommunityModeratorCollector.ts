import { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityModeratorCollector {
  export async function collect(props: {
    body: ICommunityModerator.ICreate;
    communityCommunities: IEntity;
    communityMembers: IEntity;
    communityMemberSessions: IEntity;
  }) {
    return {
      id: v4(),
      role: "moderator",
      created_at: new Date(),
      community: { connect: { id: props.communityCommunities.id } },
      member: { connect: { id: props.body.member_id } },
    } satisfies Prisma.community_moderatorsCreateInput;
  }
}
