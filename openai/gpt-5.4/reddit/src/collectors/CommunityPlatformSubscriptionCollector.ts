import { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformSubscriptionCollector {
  export async function collect(props: {
    body: ICommunityPlatformSubscription.ICreate;
    member: IEntity;
    community: IEntity;
  }) {
    const now: Date = new Date();
    return {
      id: v4(),
      active: true,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      member: {
        connect: {
          id: props.member.id,
        },
      },
      community: {
        connect: {
          id: props.community.id,
        },
      },
    } satisfies Prisma.community_platform_subscriptionsCreateInput;
  }
}
