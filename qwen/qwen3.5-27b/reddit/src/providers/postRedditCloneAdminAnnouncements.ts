import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import { IRedditCloneAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAnnouncement";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneAdminAnnouncements(props: {
  admin: AdminPayload;
  body: IRedditCloneAnnouncement.ICreate;
}): Promise<IRedditCloneAnnouncement> {
  const adminRecord =
    await MyGlobal.prisma.reddit_clone_admins.findUniqueOrThrow({
      where: {
        id: props.admin.id,
        deleted_at: null,
      },
      select: {
        id: true,
        username: true,
        email: true,
        display_name: true,
        created_at: true,
        deleted_at: true,
      },
    });
  const now = new Date();
  const scheduledAt = props.body.scheduledDeliveryTime
    ? new Date(props.body.scheduledDeliveryTime)
    : null;
  const status = scheduledAt && scheduledAt > now ? "scheduled" : "active";
  return {
    id: v4() as string & tags.Format<"uuid">,
    title: props.body.title,
    content: props.body.content,
    visibility: props.body.visibilityScope,
    communityIds: props.body.communities ?? null,
    userGroups: props.body.userGroups ?? null,
    scheduledAt: scheduledAt?.toISOString() ?? null,
    status,
    createdAt: now.toISOString(),
    createdBy: {
      id: adminRecord.id,
      username: adminRecord.username,
      email: adminRecord.email,
      display_name: adminRecord.display_name,
      created_at: adminRecord.created_at.toISOString(),
      deleted_at: adminRecord.deleted_at?.toISOString() ?? null,
    },
  };
}
