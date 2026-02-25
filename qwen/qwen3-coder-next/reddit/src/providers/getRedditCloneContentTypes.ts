import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneModerationReportContentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationReportContentType";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneContentTypes(): Promise<
  IRedditCloneModerationReportContentType[]
> {
  const contentTypes =
    await MyGlobal.prisma.reddit_clone_moderation_report_content_types.findMany(
      {
        orderBy: { code: "asc" },
      },
    );
  return contentTypes.map((ct) => ({
    id: ct.id,
    code: ct.code,
    name: ct.name,
    description: ct.description ?? null,
  }));
}
