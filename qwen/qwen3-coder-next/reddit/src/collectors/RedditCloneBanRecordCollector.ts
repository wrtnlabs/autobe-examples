import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBanRecord";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCloneBanRecordCollector {
  export async function collect(props: {
    body: IRedditCloneBanRecord.ICreate;
    redditCloneCommunities: IEntity;
    redditCloneModerators: IEntity;
    redditCloneMemberSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      created_at: new Date(),
      expires_at: props.body.expires_at ?? null,
      reason: props.body.reason,
      is_active: true,
      lifted_at: null,
      community: { connect: { id: props.redditCloneCommunities.id } },
      member: { connect: { id: props.body.member_id } },
      moderator: { connect: { id: props.redditCloneModerators.id } },
      appeal: undefined,
    } satisfies Prisma.reddit_clone_ban_recordsCreateInput;
  }
}
