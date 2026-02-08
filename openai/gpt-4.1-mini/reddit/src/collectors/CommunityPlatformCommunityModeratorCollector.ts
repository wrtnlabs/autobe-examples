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
    role: string;
    community: IEntity;
    communityModerator: IEntity;
  }) {
    const id = v4();
    const now = new Date();
    return {
      id,
      role: props.role,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      community: { connect: { id: props.community.id } },
      communityModerator: { connect: { id: props.communityModerator.id } },
    } satisfies Prisma.community_platform_community_moderatorsCreateInput;
  }
}
