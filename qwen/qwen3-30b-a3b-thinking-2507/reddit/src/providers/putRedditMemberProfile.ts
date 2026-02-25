import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditProfileTransformer } from "../transformers/RedditProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditMemberProfile(props: {
  member: MemberPayload;
  body: IRedditProfile.IUpdate;
}): Promise<IRedditProfile> {
  await MyGlobal.prisma.reddit_profiles.findUniqueOrThrow({
    where: { reddit_members_id: props.member.id },
  });
  const updatedProfile = await MyGlobal.prisma.reddit_profiles.update({
    where: { reddit_members_id: props.member.id },
    data: {
      ...(props.body.display_name && { display_name: props.body.display_name }),
      ...(props.body.bio && { bio: props.body.bio }),
      ...(props.body.avatar && { avatar: props.body.avatar }),
      updated_at: new Date(),
    },
    ...RedditProfileTransformer.select(),
  });
  return await RedditProfileTransformer.transform(updatedProfile);
}
