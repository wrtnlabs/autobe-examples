import { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformReportedContentsId(props: {
  id: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReportedContent> {
  const record =
    await MyGlobal.prisma.community_platform_reported_contents.findUnique({
      where: { id: props.id },
      include: {
        report: true,
        reportedPost: true,
        reportedComment: true,
      },
    });
  if (!record) throw new HttpException("Reported content not found", 404);
  function safeConvertDateToString(obj: any): any {
    if (obj == null) return obj;
    if (Array.isArray(obj)) {
      return obj.map(safeConvertDateToString);
    }
    if (typeof obj === "object") {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value instanceof Date) {
          result[key] = toISOStringSafe(value);
        } else if (value !== null && typeof value === "object") {
          result[key] = safeConvertDateToString(value);
        } else {
          result[key] = value;
        }
      }
      return result;
    }
    return obj;
  }
  return safeConvertDateToString(record) as ICommunityPlatformReportedContent;
}
