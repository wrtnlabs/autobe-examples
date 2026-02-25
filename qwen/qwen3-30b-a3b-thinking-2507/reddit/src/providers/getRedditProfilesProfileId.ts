import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditProfileTransformer } from "../transformers/RedditProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditProfilesProfileId(props: {
  profileId: string & tags.Format<"uuid">;
}): Promise<IRedditProfile> {
  const profile = await MyGlobal.prisma.reddit_profiles.findUniqueOrThrow({
    where: { id: props.profileId },
    ...RedditProfileTransformer.select(),
  });
  return await RedditProfileTransformer.transform(profile);
}
