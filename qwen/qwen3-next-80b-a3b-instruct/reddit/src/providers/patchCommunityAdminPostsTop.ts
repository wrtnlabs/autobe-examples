import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
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

export async function patchCommunityAdminPostsTop(props: {
  admin: AdminPayload;
  body: ICommunityPost.IRequest;
}): Promise<IPageICommunityPost.ISummary> {
  // Validate required parameters
  const allowedTimePeriods = [
    "today",
    "thisWeek",
    "thisMonth",
    "thisYear",
    "allTime",
  ] as const;
  // This is an unknown IRequest structure - we cannot access timePeriod, page, or limit
  // We must reject this and let higher-level agent resolve the type definition mismatch
  throw new HttpException(
    "IRequest interface does not support timePeriod, page, or limit properties as expected",
    500,
  );
}
