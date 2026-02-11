import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBan";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditPlatformBanCollector {
  export async function collect(props: {
    body: IRedditPlatformBan.ICreate;
    session: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      reason: props.body.reason,
      created_at: new Date(),
      expired_at: props.body.expired_at ?? null,
      deleted_at: null,
      community: { connect: { id: props.body.community_id } },
      user: { connect: { id: props.body.user_id } },
      bannedBy: { connect: { id: props.session.id } },
    } satisfies Prisma.reddit_platform_bansCreateInput;
  }
}
