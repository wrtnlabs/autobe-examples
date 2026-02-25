import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationLog";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformModerationLogTransformer } from "../transformers/CommunityPlatformModerationLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformModeratorModerationLogsModerationLogId(props: {
  moderator: ModeratorPayload;
  moderationLogId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformModerationLog> {
  // Fetch the full moderation log record without complex select to avoid Prisma type mismatches
  const moderationLogRecordRaw =
    await MyGlobal.prisma.community_platform_moderation_logs.findUniqueOrThrow({
      where: { id: props.moderationLogId },
    });
  // Helper function to recursively convert Date objects to date-time formatted strings
  function convertDatesToStrings(obj: any): any {
    if (obj === null) return null;
    if (obj instanceof Date) return toISOStringSafe(obj);
    if (Array.isArray(obj)) return obj.map(convertDatesToStrings);
    if (typeof obj === "object") {
      const res: any = {};
      for (const key in obj) {
        if (Object.hasOwnProperty.call(obj, key)) {
          res[key] = convertDatesToStrings(obj[key]);
        }
      }
      return res;
    }
    return obj;
  }
  const convertedRecord = convertDatesToStrings(moderationLogRecordRaw);
  // Transform the converted record to the output interface
  return await CommunityPlatformModerationLogTransformer.transform(
    convertedRecord,
  );
}
