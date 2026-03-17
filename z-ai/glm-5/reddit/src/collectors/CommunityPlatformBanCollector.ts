import { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformBanCollector {
  export async function collect(props: {
    body: ICommunityPlatformBan.ICreate;
    communityPlatformCommunities: IEntity;
    communityPlatformModerators: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      reason: props.body.reason,
      created_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.body.memberId } },
      community: { connect: { id: props.communityPlatformCommunities.id } },
      moderator: { connect: { id: props.communityPlatformModerators.id } },
    } satisfies Prisma.community_platform_bansCreateInput;
  }
}
