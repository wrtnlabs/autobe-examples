import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { IRedditCloneModeratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorPasswordReset";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditCloneModeratorPasswordResetTransformer } from "../transformers/RedditCloneModeratorPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneModeratorModeratorPasswordResetsResetId(props: {
  moderator: ModeratorPayload;
  resetId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneModeratorPasswordReset> {
  const record =
    await MyGlobal.prisma.reddit_clone_moderator_password_resets.findFirstOrThrow(
      {
        ...RedditCloneModeratorPasswordResetTransformer.select(),
        where: { id: props.resetId },
      },
    );
  return await RedditCloneModeratorPasswordResetTransformer.transform(record);
}
