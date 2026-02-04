import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformCommunityCollector {
  export async function collect(props: {
    body: ICommunityPlatformCommunity.ICreate;
    communityPlatformMembers: IEntity; // from authorized actor
    communityPlatformMemberSessions: IEntity; // from authorized session
  }) {
    return {
      id: v4(),
      name: "",
      description: "",
      icon: null,
      subscriber_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      owner: {
        connect: { id: props.communityPlatformMembers.id },
      },
    } satisfies Prisma.community_platform_communitiesCreateInput;
  }
}
