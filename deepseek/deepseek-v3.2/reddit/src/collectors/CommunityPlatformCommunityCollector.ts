import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformCommunityCollector {
  export async function collect(props: {
    body: ICommunityPlatformCommunity.ICreate;
    ownerMember: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      // Scalar fields
      id,
      name: props.body.name,
      description: props.body.description ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      // BelongsTo relations
      ownerMember: { connect: { id: props.ownerMember.id } },
      // HasMany relations - all undefined (not creatable from this DTO)
      snapshots: undefined,
      images: undefined,
      subscriberCount: undefined,
      moderationRoles: undefined,
      bans: undefined,
      communitySubscriptions: undefined,
      subscriptionActivities: undefined,
      posts: undefined,
      contentReports: undefined,
      userReports: undefined,
    } satisfies Prisma.community_platform_communitiesCreateInput;
  }
}
