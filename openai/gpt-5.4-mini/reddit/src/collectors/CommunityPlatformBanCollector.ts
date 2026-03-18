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
    community: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      reason: props.body.reason,
      started_at: new Date(props.body.startedAt),
      ended_at: props.body.endedAt ? new Date(props.body.endedAt) : null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: {
        connect: {
          id: props.body.communityPlatformMemberId,
        },
      },
      community: {
        connect: {
          id: props.community.id,
        },
      },
    } satisfies Prisma.community_platform_bansCreateInput;
  }
}
