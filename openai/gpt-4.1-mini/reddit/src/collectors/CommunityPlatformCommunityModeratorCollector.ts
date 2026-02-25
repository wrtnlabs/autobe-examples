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
    const id: string = v4();
    return {
      id,
      role: props.body.role,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      community: { connect: { id: props.communityPlatformCommunities.id } },
      communityModerator: { connect: { id: props.body.communityModeratorId } },
    } satisfies Prisma.community_platform_community_moderatorsCreateInput;
  }
}
