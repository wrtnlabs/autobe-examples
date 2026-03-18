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
    communityPlatformCommunityBans: IEntity;
    communityPlatformCommunities: IEntity;
    bannedUser: IEntity;
    appliedByModerator: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      ban_status: props.body.ban_status,
      reason: props.body.reason,
      effective_from: new Date(props.body.effective_from),
      effective_until:
        props.body.effective_until === undefined
          ? undefined
          : props.body.effective_until === null
            ? null
            : new Date(props.body.effective_until),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      communityBan: {
        connect: { id: props.communityPlatformCommunityBans.id },
      },
      community: { connect: { id: props.communityPlatformCommunities.id } },
      bannedUser: { connect: { id: props.bannedUser.id } },
      appliedByModerator: { connect: { id: props.appliedByModerator.id } },
    } satisfies Prisma.community_platform_community_ban_snapshotsCreateInput;
  }
}
