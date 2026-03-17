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
    communityPlatformMemberSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      active: props.body.active ?? true,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      member: { connect: { id: props.communityPlatformMembers.id } },
      community: { connect: { id: props.body.community_id } },
      // HasMany/HasOne relations (no nested creation for initial subscription)
      snapshots: undefined,
      activities: undefined,
      preference: undefined,
    } satisfies Prisma.community_platform_subscriptionsCreateInput;
  }
}
