import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformUserSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSettings";
import { IPageICommunityPlatformUserSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserSettings";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchCommunityPlatformAdministratorUserSettings(props: {
  administrator: AdministratorPayload;
  body: ICommunityPlatformUserSettings.IRequest;
}): Promise<IPageICommunityPlatformUserSettings.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build where condition dynamically
  const where: Record<string, any> = {};
  if (props.body.community_platform_user_id !== undefined) {
    where.community_platform_user_id = props.body.community_platform_user_id;
  }
  if (props.body.language !== undefined) {
    where.language = props.body.language;
  }
  if (props.body.theme !== undefined) {
    where.theme = props.body.theme;
  }
  if (props.body.default_post_sort !== undefined) {
    where.default_post_sort = props.body.default_post_sort;
  }
  if (props.body.feature_toggles !== undefined) {
    where.feature_toggles = props.body.feature_toggles;
  }

  // Sorting
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (
    props.body.sort_by &&
    (props.body.sort_direction === "asc" ||
      props.body.sort_direction === "desc")
  ) {
    orderBy = { [props.body.sort_by]: props.body.sort_direction };
  }

  const [records, total] = await Promise.all([
    MyGlobal.prisma.community_platform_user_settings.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        user: true,
      },
    }),
    MyGlobal.prisma.community_platform_user_settings.count({ where }),
  ]);

  const data = records.map((item) => ({
    id: item.id,
    user: { id: item.community_platform_user_id },
    language: item.language,
    theme: item.theme,
    default_post_sort: item.default_post_sort,
    feature_toggles: item.feature_toggles,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : undefined,
  }));

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
