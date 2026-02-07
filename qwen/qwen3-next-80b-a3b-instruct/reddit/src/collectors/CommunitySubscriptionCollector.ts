import { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunitySubscriptionCollector {
  export async function collect(props: {
    body: ICommunitySubscription.ICreate;
    community_member_id: string;
    community_community_id: string;
  }) {
    const id: string = v4();
    return {
      id,
      created_at: new Date(),
      updated_at: new Date(),
      member: { connect: { id: props.community_member_id } },
      community: { connect: { id: props.community_community_id } },
    } satisfies Prisma.community_subscriptionsCreateInput;
  }
}
