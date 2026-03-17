import { ICommunityPlatformCommunityBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBanSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformCommunityBanSnapshotCollector {
  export async function collect(props: {
    body: ICommunityPlatformCommunityBanSnapshot.ICreate;
    communityBan: IEntity;
    createdByMember: IEntity | null;
  }) {
    return {
      id: v4(),
      communityBan: {
        connect: {
          id: props.communityBan.id,
        },
      },
      createdByMember:
        props.createdByMember !== null
          ? {
              connect: {
                id: props.createdByMember.id,
              },
            }
          : undefined,
    } satisfies Prisma.community_platform_community_ban_snapshotsCreateInput;
  }
}
