import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneUserProfileTransformer } from "../transformers/RedditCloneUserProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneProfilesMemberId(props: {
  memberId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneUserProfile> {
  const profile =
    await MyGlobal.prisma.reddit_clone_user_profiles.findFirstOrThrow({
      where: {
        member_id: props.memberId,
        deleted_at: null,
        member: {
          deleted_at: null,
        },
      },
      ...RedditCloneUserProfileTransformer.select(),
    });
  return await RedditCloneUserProfileTransformer.transform(profile);
}
