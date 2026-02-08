import { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportedContent";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformReportedContents(props: {
  body: ICommunityPlatformReportedContent.IRequest;
}): Promise<IPageICommunityPlatformReportedContent.ISummary> {
  return {
    data: [],
    pagination: {
      current: 1,
      limit: 100,
      records: 0,
      pages: 0,
    },
  };
}
