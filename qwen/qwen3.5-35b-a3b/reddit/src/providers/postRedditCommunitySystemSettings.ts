import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunitySystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemSetting";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunitySystemSettingCollector } from "../collectors/RedditCommunitySystemSettingCollector";
import { RedditCommunitySystemSettingTransformer } from "../transformers/RedditCommunitySystemSettingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunitySystemSettings(props: {
  body: IRedditCommunitySystemSetting.ICreate;
}): Promise<IRedditCommunitySystemSetting> {
  const created = await MyGlobal.prisma.reddit_community_system_settings.create(
    {
      data: await RedditCommunitySystemSettingCollector.collect({
        body: props.body,
      }),
      ...RedditCommunitySystemSettingTransformer.select(),
    },
  );
  return await RedditCommunitySystemSettingTransformer.transform(created);
}
