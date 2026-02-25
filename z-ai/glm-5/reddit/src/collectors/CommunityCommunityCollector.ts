import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityCommunityCollector {
  export async function collect(props: {
    body: ICommunityCommunity.ICreate;
    communityMember: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      name: props.body.name,
      description: props.body.description,
      icon_url: props.body.icon_url ?? null,
      subscriber_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      owner: { connect: { id: props.communityMember.id } },
      // HasMany relations - not needed for creation
      subscriptions: undefined,
      moderators: undefined,
      bans: undefined,
      moderationLogs: undefined,
      posts: undefined,
      postSnapshots: undefined,
      reports: undefined,
    } satisfies Prisma.community_communitiesCreateInput;
  }
}
