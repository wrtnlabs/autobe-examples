import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformSystematicConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSystematicConfig";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformSystematicConfigCollector } from "../collectors/RedditPlatformSystematicConfigCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditPlatformSystematicConfigTransformer } from "../transformers/RedditPlatformSystematicConfigTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformAdminSystemConfigs(props: {
  admin: AdminPayload;
  body: IRedditPlatformSystematicConfig.ICreate;
}): Promise<IRedditPlatformSystematicConfig> {
  const adminEntity: IEntity = { id: props.admin.id };
  const sessionEntity: IEntity = { id: props.admin.session_id };
  const created =
    await MyGlobal.prisma.reddit_platform_systematic_configs.create({
      data: await RedditPlatformSystematicConfigCollector.collect({
        body: props.body,
        redditPlatformAdmins: adminEntity,
        redditPlatformAdminSessions: sessionEntity,
      }),
      ...RedditPlatformSystematicConfigTransformer.select(),
    });
  return await RedditPlatformSystematicConfigTransformer.transform(created);
}
