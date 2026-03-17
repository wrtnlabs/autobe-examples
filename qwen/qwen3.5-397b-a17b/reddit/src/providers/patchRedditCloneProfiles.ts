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

export async function patchRedditCloneProfiles(props: {
  body: IRedditCloneUserProfile.IUpdate;
}): Promise<IRedditCloneUserProfile> {
  const sessionToken = MyGlobal.env.JWT_SECRET_KEY;
  const decoded = jwt.decode(sessionToken) as {
    member_id: string;
  } | null;
  if (!decoded || !decoded.member_id) {
    throw new HttpException("Unauthorized", 401);
  }
  const member_id = decoded.member_id as string & tags.Format<"uuid">;
  const profile =
    await MyGlobal.prisma.reddit_clone_user_profiles.findUniqueOrThrow({
      where: { member_id },
    });
  const updateData: Prisma.reddit_clone_user_profilesUpdateInput = {
    ...(props.body.display_name !== undefined && {
      display_name: props.body.display_name,
    }),
    ...(props.body.bio !== undefined && { bio: props.body.bio }),
    ...(props.body.avatar !== undefined && { avatar: props.body.avatar }),
    updated_at: new Date(),
  };
  await MyGlobal.prisma.reddit_clone_user_profiles.update({
    where: { member_id },
    data: updateData,
  });
  const updated =
    await MyGlobal.prisma.reddit_clone_user_profiles.findUniqueOrThrow({
      where: { member_id },
      ...RedditCloneUserProfileTransformer.select(),
    });
  return await RedditCloneUserProfileTransformer.transform(updated);
}
