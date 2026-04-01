import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachmentAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentAccessLog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditLikeAttachmentAccessLogTransformer {
  export type Payload = Prisma.reddit_like_attachment_access_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reddit_like_attachment_id: true,
        actor_id: true,
        actor_type: true,
        access_type: true,
        ip_address: true,
        user_agent: true,
        referer: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.reddit_like_attachment_access_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeAttachmentAccessLog> {
    return {
      id: input.id,
      redditLikeAttachmentId: input.reddit_like_attachment_id,
      actorId: input.actor_id,
      actorType: input.actor_type,
      accessType: input.access_type,
      ipAddress: input.ip_address,
      userAgent: input.user_agent,
      referer: input.referer,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
