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
    communityCommunities: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      banned_at: new Date(),
      reason: props.body.reason ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      bannedUser: { connect: { id: props.body.user_id } },
      bannedCommunity: { connect: { id: props.communityCommunities.id } },
    } satisfies Prisma.community_banned_usersCreateInput;
  }
}
