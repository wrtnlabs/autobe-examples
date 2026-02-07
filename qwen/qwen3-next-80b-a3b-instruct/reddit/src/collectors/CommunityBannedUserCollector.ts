import { ICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBannedUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityBannedUserCollector {
  export async function collect(props: {
    body: ICommunityBannedUser.ICreate;
    community: IEntity;
    bannedUser: IEntity;
    communityAdmins: IEntity;
    communityModerators: IEntity;
    reason: string; // Assumed provided in context despite empty DTO
  }) {
    const id: string = v4();
    // Extract bannedBy from authorized actor - prefer admins over moderators if both available
    const bannedBy = props.communityAdmins.id
      ? props.communityAdmins
      : props.communityModerators;
    return {
      id,
      reason: props.reason, // Use provided context reason
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      community: { connect: { id: props.community.id } },
      bannedUser: { connect: { id: props.bannedUser.id } },
      bannedBy: { connect: { id: bannedBy.id } },
    } satisfies Prisma.community_bansCreateInput;
  }
}
