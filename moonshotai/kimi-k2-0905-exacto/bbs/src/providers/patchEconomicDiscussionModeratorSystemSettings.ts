import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSystemSetting";
import { IPageIEconomicDiscussionSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionSystemSetting";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICrIPageIntegerRequired } from "@ORGANIZATION/PROJECT-api/lib/structures/ICrIPageIntegerRequired";
import { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchEconomicDiscussionModeratorSystemSettings(props: {
  moderator: ModeratorPayload;
  body: IEconomicDiscussionSystemSetting.IRequest;
}): Promise<IPageIEconomicDiscussionSystemSetting.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (props.body.search !== undefined) {
    where.OR = [
      {
        setting_key: {
          contains: props.body.search,
          mode: "insensitive" as const,
        },
      },
      {
        display_name: {
          contains: props.body.search,
          mode: "insensitive" as const,
        },
      },
      {
        description: {
          contains: props.body.search,
          mode: "insensitive" as const,
        },
      },
    ];
  }

  if (props.body.category !== undefined) {
    where.category = props.body.category;
  }

  if (props.body.is_system_critical !== undefined) {
    where.is_system_critical = props.body.is_system_critical;
  }

  const orderBy: Record<string, "asc" | "desc"> = {};

  if (props.body.sort_by) {
    orderBy[props.body.sort_by] = props.body.sort_order ?? "asc";
  } else {
    orderBy.setting_key = props.body.sort_order ?? "asc";
  }

  const [settings, total] = await Promise.all([
    MyGlobal.prisma.economic_discussion_system_settings.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.economic_discussion_system_settings.count({ where }),
  ]);

  const data: IEconomicDiscussionSystemSetting.ISummary[] = await Promise.all(
    settings.map(async (setting) => {
      let moderatorInfo: IEconomicDiscussionModerator.ISummary | undefined;

      if (setting.last_modified_by) {
        const moderator =
          await MyGlobal.prisma.economic_discussion_moderators.findUnique({
            where: { username: setting.last_modified_by },
          });

        if (moderator) {
          moderatorInfo = {
            id: moderator.id,
            username: moderator.username,
            email_verified: moderator.email_verified,
            two_factor_enabled: moderator.two_factor_enabled,
            moderation_level: moderator.moderation_level,
            created_at: toISOStringSafe(moderator.created_at),
          };
        }
      }

      return {
        setting_key: setting.setting_key,
        setting_value: setting.setting_value,
        setting_type: setting.setting_type as
          | "string"
          | "integer"
          | "boolean"
          | "json"
          | "float",
        display_name: setting.display_name,
        category: setting.category,
        is_system_critical: setting.is_system_critical,
        last_modified_by: moderatorInfo ?? {
          id: v4() as string & tags.Format<"uuid">,
          username: setting.last_modified_by ?? "System",
          email_verified: true,
          two_factor_enabled: false,
          moderation_level: "unknown",
          created_at: toISOStringSafe(new Date()),
        },
        modification_history: [],
        permission_context: {
          required_role: setting.is_system_critical ? "admin" : "moderator",
          requires_approval: setting.is_system_critical,
          approval_process: setting.is_system_critical
            ? "System critical settings require administrative approval"
            : undefined,
          affected_categories: [setting.category],
        },
      };
    }),
  );

  return {
    data,
    pagination: {
      current: page.toString() as ICrIPageIntegerRequired,
      limit: limit.toString() as ICrIPageIntegerRequired,
      records: total.toString() as ICrIPageIntegerRequired,
      pages: Math.ceil(total / limit).toString() as ICrIPageIntegerRequired,
    },
  };
}
