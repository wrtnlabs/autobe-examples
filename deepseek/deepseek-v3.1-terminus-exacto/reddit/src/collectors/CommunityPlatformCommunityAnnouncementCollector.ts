import { ICommunityPlatformCommunityAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityAnnouncement";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformCommunityAnnouncementCollector {
  export async function collect(props: {
    body: ICommunityPlatformCommunityAnnouncement.ICreate;
    communityPlatformCommunities: IEntity;
    communityPlatformUsers: IEntity;
    communityPlatformUserSessions: IEntity;
  }) {
    const id: string = v4();
    const isPinned = props.body.is_pinned ?? false;
    const status = props.body.status ?? "active";
    return {
      id,
      title: props.body.title,
      content: props.body.content,
      is_pinned: isPinned,
      status,
      pinned_at: isPinned ? new Date() : null,
      created_at: new Date(),
      updated_at: new Date(),
      community: { connect: { id: props.communityPlatformCommunities.id } },
      author: { connect: { id: props.communityPlatformUsers.id } },
    } satisfies Prisma.community_platform_community_announcementsCreateInput;
  }
}
