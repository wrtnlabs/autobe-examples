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
    communityPlatformMembers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      member: { connect: { id: props.communityPlatformMembers.id } },
      community: { connect: { id: props.body.community_id } },
    } satisfies Prisma.community_platform_subscriptionsCreateInput;
  }
}
