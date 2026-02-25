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
    owner: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      name: props.body.name,
      description: props.body.description,
      icon_url: props.body.icon_url ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relation
      owner: { connect: { id: props.owner.id } },
      // HasMany/HasOne relations - all undefined (reverse relations)
      auditLogs: undefined,
      systemNotifications: undefined,
      snapshots: undefined,
      userSubscriptions: undefined,
      moderators: undefined,
      rules: undefined,
      statistic: undefined,
      announcements: undefined,
      invitations: undefined,
      flairs: undefined,
      wikiPages: undefined,
      flairAssignments: undefined,
      communityPosts: undefined,
      bans: undefined,
      moderatorAssignments: undefined,
      moderationAuditLogs: undefined,
      moderationActionLogs: undefined,
    } satisfies Prisma.community_platform_communitiesCreateInput;
  }
}
