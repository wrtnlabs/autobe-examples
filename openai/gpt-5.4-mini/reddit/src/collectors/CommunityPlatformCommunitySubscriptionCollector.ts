import { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformCommunitySubscriptionCollector {
  export async function collect(props: {
    body: ICommunityPlatformCommunitySubscription.ICreate;
    member: IEntity;
    community: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      subscription_status: props.body.subscriptionStatus,
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
    } satisfies Prisma.community_platform_community_subscriptionsCreateInput;
  }
}
