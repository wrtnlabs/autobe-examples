import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformSystematicConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSystematicConfig";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditPlatformSystematicConfigCollector {
  export async function collect(props: {
    body: IRedditPlatformSystematicConfig.ICreate;
    redditPlatformAdmins: IEntity;
    redditPlatformAdminSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      config_key: props.body.config_key,
      config_value: props.body.config_value,
      config_type: props.body.config_type,
      description: props.body.description ?? null,
      is_active: props.body.is_active ?? false,
      created_at: new Date(),
      updated_at: new Date(),
    } satisfies Prisma.reddit_platform_systematic_configsCreateInput;
  }
}
