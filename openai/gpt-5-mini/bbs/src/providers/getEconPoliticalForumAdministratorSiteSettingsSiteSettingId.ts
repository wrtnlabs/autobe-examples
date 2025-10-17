import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumSiteSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumSiteSetting";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function getEconPoliticalForumAdministratorSiteSettingsSiteSettingId(props: {
  administrator: AdministratorPayload;
  siteSettingId: string & tags.Format<"uuid">;
}): Promise<IEconPoliticalForumSiteSetting> {
  const { administrator, siteSettingId } = props;

  if (!administrator || administrator.type !== "administrator") {
    throw new HttpException("Unauthorized", 401);
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(String(siteSettingId))) {
    throw new HttpException("Invalid siteSettingId", 400);
  }

  try {
    const record =
      await MyGlobal.prisma.econ_political_forum_site_settings.findUnique({
        where: { id: siteSettingId },
      });

    if (!record) throw new HttpException("Not Found", 404);
    if (record.deleted_at !== null) throw new HttpException("Not Found", 404);

    const requestId = v4();
    const now = toISOStringSafe(new Date());

    await MyGlobal.prisma.econ_political_forum_audit_logs.create({
      data: {
        id: v4(),
        registereduser_id: administrator.id,
        action_type: "read_site_setting",
        target_type: "site_setting",
        target_identifier: siteSettingId,
        details: JSON.stringify({ request_id: requestId, key: record.key }),
        created_at: now,
        created_by_system: false,
      },
    });

    return {
      id: record.id,
      key: record.key,
      value: record.value,
      description: record.description ?? null,
      environment: record.environment ?? null,
      is_public: record.is_public,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    };
  } catch (error) {
    if (error instanceof HttpException) throw error;
    throw new HttpException("Internal Server Error", 500);
  }
}
