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
  }) {
    const id: string = v4();
    // Query member by username to resolve member_id
    const member = await MyGlobal.prisma.community_members.findFirstOrThrow({
      where: {
        username: props.body.member_username,
        deleted_at: null,
      },
    });
    return {
      id,
      is_owner: false,
      created_at: new Date(),
      updated_at: new Date(),
      community: { connect: { id: props.communityCommunities.id } },
      member: { connect: { id: member.id } },
      appointer: { connect: { id: props.communityMembers.id } },
    } satisfies Prisma.community_moderatorsCreateInput;
  }
}
