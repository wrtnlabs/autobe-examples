import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformModeratorCollector {
  export async function collect(props: {
    body: ICommunityPlatformModerator.ICreate;
    communityPlatformCommunities: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      role: "moderator",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.body.memberId } },
      community: { connect: { id: props.communityPlatformCommunities.id } },
    } satisfies Prisma.community_platform_moderatorsCreateInput;
  }
}
