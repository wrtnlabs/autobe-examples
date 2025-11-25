import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformNotificationSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationSettings";
import { IPageICommunityPlatformNotificationSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformNotificationSettings";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchCommunityPlatformAdministratorNotificationSettings(props: {
  administrator: AdministratorPayload;
  body: ICommunityPlatformNotificationSettings.IRequest;
}): Promise<IPageICommunityPlatformNotificationSettings.ISummary> {
  const body = props.body;
  // Pagination defaults
  const page = body.page ?? 0;
  const limit = body.limit ?? 100;
  const skip = page * limit;

  // Build filter conditions for notification settings and related user
  const where = {
    deleted_at: null,
    ...(body.email_notifications_enabled !== undefined && {
      email_notifications_enabled: body.email_notifications_enabled,
    }),
    ...(body.push_notifications_enabled !== undefined && {
      push_notifications_enabled: body.push_notifications_enabled,
    }),
    ...(body.mentions_alerts_enabled !== undefined && {
      mentions_alerts_enabled: body.mentions_alerts_enabled,
    }),
    ...(body.activity_notifications_enabled !== undefined && {
      activity_notifications_enabled: body.activity_notifications_enabled,
    }),
    ...(body.moderator_alerts_enabled !== undefined && {
      moderator_alerts_enabled: body.moderator_alerts_enabled,
    }),
    ...(body.search && {
      user: {
        email: {
          contains: body.search,
          mode: "insensitive" as const,
        },
      },
    }),
  };

  const [total, records] = await Promise.all([
    MyGlobal.prisma.community_platform_notification_settings.count({
      where,
    }),
    MyGlobal.prisma.community_platform_notification_settings.findMany({
      where,
      include: {
        user: true,
      },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
  ]);

  const result: IPageICommunityPlatformNotificationSettings.ISummary = {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total satisfies number as number,
      pages: Math.ceil(total / limit) satisfies number as number,
    },
    data: records.map((s) => ({
      id: s.id,
      user: {
        id: (s as any).user?.id ?? s.community_platform_user_id,
      },
      email_notifications_enabled: s.email_notifications_enabled,
      push_notifications_enabled: s.push_notifications_enabled,
      mentions_alerts_enabled: s.mentions_alerts_enabled,
      activity_notifications_enabled: s.activity_notifications_enabled,
      moderator_alerts_enabled: s.moderator_alerts_enabled,
      created_at: toISOStringSafe(s.created_at),
      updated_at: toISOStringSafe(s.updated_at),
      deleted_at:
        s.deleted_at === null ? undefined : toISOStringSafe(s.deleted_at),
    })),
  };
  return result;
}
