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
    communityPlatformUsers: IEntity;
  }) {
    const community =
      await MyGlobal.prisma.community_platform_communities.findFirstOrThrow({
        where: { name: props.body.communityCode },
      });
    return {
      id: v4(),
      community: { connect: { id: community.id } },
      user: { connect: { id: props.communityPlatformUsers.id } },
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.community_platform_community_subscriptionsCreateInput;
  }
}
