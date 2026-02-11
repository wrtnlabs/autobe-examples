import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportResolution";
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

export async function deleteRedditPlatformAdminReportResolutionsResolutionId(props: {
  admin: AdminPayload;
  resolutionId: string;
}): Promise<IRedditPlatformReportResolution.IDeleteResponse> {
  const existing =
    await MyGlobal.prisma.reddit_platform_report_resolutions.findUnique({
      where: { id: props.resolutionId },
    });
  if (!existing) {
    throw new HttpException("Resolution not found", 404);
  }
  await MyGlobal.prisma.reddit_platform_report_resolutions.delete({
    where: { id: props.resolutionId },
  });
  return { message: "Resolution successfully deleted" };
}
