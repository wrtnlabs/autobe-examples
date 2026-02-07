import { ICommunityApiKey } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityApiKey";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityApiKeyCollector {
  export async function collect(props: {
    body: ICommunityApiKey.ICreate;
    communityMembers: IEntity;
    communityAdmins: IEntity;
    communityModerators: IEntity;
    communityMemberSessions: IEntity;
    communityAdminSessions: IEntity;
    communityModeratorSessions: IEntity;
  }) {
    const id: string = v4();
    const key: string = v4();
    const expiredAt: Date = new Date();
    expiredAt.setFullYear(expiredAt.getFullYear() + 1);
    return {
      id,
      key,
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
      expired_at: expiredAt,
      actor: { connect: { id: props.communityMembers.id } },
      creator: { connect: { id: props.communityMembers.id } },
    } satisfies Prisma.community_api_keysCreateInput;
  }
}
