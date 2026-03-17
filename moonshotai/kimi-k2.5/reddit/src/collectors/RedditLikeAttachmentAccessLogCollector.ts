import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachmentAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentAccessLog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditLikeAttachmentAccessLogCollector {
  export async function collect(props: {
    body: IRedditLikeAttachmentAccessLog.ICreate;
    redditLikeAttachments: IEntity;
    redditLikeMembers: IEntity;
  }) {
    return {
      id: v4(),
      actor_type: "member",
      access_type: props.body.access_type,
      ip_address: props.body.ip_address ?? null,
      user_agent: props.body.user_agent ?? null,
      referer: props.body.referer ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      attachment: { connect: { id: props.redditLikeAttachments.id } },
      actor: { connect: { id: props.redditLikeMembers.id } },
    } satisfies Prisma.reddit_like_attachment_access_logsCreateInput;
  }
}
