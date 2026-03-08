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
    communityPlatformCommunities: IEntity;
  }) {
    // Query member by username to get member_id
    const member =
      await MyGlobal.prisma.community_platform_members.findFirstOrThrow({
        where: { username: props.body.username },
      });
    return {
      id: v4(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      community: { connect: { id: props.communityPlatformCommunities.id } },
      member: { connect: { id: member.id } },
    } satisfies Prisma.community_platform_community_moderatorsCreateInput;
  }
}
