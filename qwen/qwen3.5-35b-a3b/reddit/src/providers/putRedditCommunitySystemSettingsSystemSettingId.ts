import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunitySystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemSetting";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunitySystemSettingTransformer } from "../transformers/RedditCommunitySystemSettingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCommunitySystemSettingsSystemSettingId(props: {
  systemSettingId: string & tags.Format<"uuid">;
  body: IRedditCommunitySystemSetting.IUpdate;
}): Promise<IRedditCommunitySystemSetting> {
  const updated = await MyGlobal.prisma.reddit_community_system_settings.update(
    {
      where: {
        id: props.systemSettingId,
        deleted_at: null,
      },
      data: {
        value: props.body.value,
        ...(props.body.description !== undefined && {
          description: props.body.description,
        }),
        updated_at: new Date(),
      },
      ...RedditCommunitySystemSettingTransformer.select(),
    },
  );
  return await RedditCommunitySystemSettingTransformer.transform(updated);
}
