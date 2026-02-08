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
    community: IEntity;
    user: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      community: { connect: { id: props.community.id } },
      user: { connect: { id: props.user.id } },
    } satisfies Prisma.community_platform_community_subscriptionsCreateInput;
  }
}
