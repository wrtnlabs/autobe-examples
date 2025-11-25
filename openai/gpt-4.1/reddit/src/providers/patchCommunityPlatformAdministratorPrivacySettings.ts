import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPrivacySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPrivacySettings";
import { IPageICommunityPlatformPrivacySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPrivacySettings";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchCommunityPlatformAdministratorPrivacySettings(props: {
  administrator: AdministratorPayload;
  body: ICommunityPlatformPrivacySettings.IRequest;
}): Promise<IPageICommunityPlatformPrivacySettings.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build filter object with proper typings and non-mutating pattern
  const where = {
    ...(typeof props.body.profile_visibility === "string" && {
      profile_visibility: props.body.profile_visibility,
    }),
    ...(typeof props.body.search_discoverable === "boolean" && {
      search_discoverable: props.body.search_discoverable,
    }),
    ...(typeof props.body.data_export_enabled === "boolean" && {
      data_export_enabled: props.body.data_export_enabled,
    }),
    deleted_at: null,
    ...(() => {
      const searchQuery = props.body.q;
      if (typeof searchQuery === "string" && searchQuery.length > 0) {
        return {
          OR: [
            { user: { email: { contains: searchQuery } } },
            { user: { username: { contains: searchQuery } } },
            { profile_visibility: { contains: searchQuery } },
          ],
        };
      }
      return {};
    })(),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_privacy_settings.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: { user: true },
    }),
    MyGlobal.prisma.community_platform_privacy_settings.count({
      where,
    }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    user: {
      id: row.user.id,
    },
    profile_visibility: row.profile_visibility,
    search_discoverable: row.search_discoverable,
    data_processing_consent: row.data_processing_consent,
    data_export_enabled: row.data_export_enabled,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      row.deleted_at !== null && typeof row.deleted_at !== "undefined"
        ? toISOStringSafe(row.deleted_at)
        : row.deleted_at,
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
