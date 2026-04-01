import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachmentAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentAccessLog";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeMemberAtSummaryTransformer } from "./RedditLikeMemberAtSummaryTransformer";

export namespace RedditLikeAttachmentAccessLogAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_attachment_access_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        actor_type: true,
        access_type: true,
        ip_address: true,
        user_agent: true,
        referer: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        actor: RedditLikeMemberAtSummaryTransformer.select(),
        attachment: true,
      },
    } satisfies Prisma.reddit_like_attachment_access_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeAttachmentAccessLog.ISummary> {
    return {
      id: input.id,
      actorType: input.actor_type ?? null,
      accessType: input.access_type,
      ipAddress: input.ip_address ?? null,
      userAgent: input.user_agent ?? null,
      referer: input.referer ?? null,
      createdAt: input.created_at.toISOString(),
      actor: input.actor
        ? await RedditLikeMemberAtSummaryTransformer.transform(input.actor)
        : null,
    };
  }
}
