import { ICommunityUserProfileKarmaLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityUserProfileKarmaLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityUserProfileKarmaLogTransformer } from "../transformers/CommunityUserProfileKarmaLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityUserProfilesUserProfileIdKarmaLogsKarmaLogId(props: {
  userProfileId: string & tags.Format<"uuid">;
  karmaLogId: string & tags.Format<"uuid">;
}): Promise<ICommunityUserProfileKarmaLog> {
  const karmaLog =
    await MyGlobal.prisma.community_user_profile_karma_logs.findUniqueOrThrow({
      where: { id: props.karmaLogId },
      ...CommunityUserProfileKarmaLogTransformer.select(),
    });
  if (karmaLog.community_user_profile_id !== props.userProfileId) {
    throw new HttpException("Not Found", 404);
  }
  return CommunityUserProfileKarmaLogTransformer.transform(karmaLog);
}
