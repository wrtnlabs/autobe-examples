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
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      subscribed_at: now,
      is_active: true,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      community: { connect: { id: props.body.community_id } },
      member: { connect: { id: props.member.id } },
    } satisfies Prisma.community_platform_community_subscriptionsCreateInput;
  }
}
