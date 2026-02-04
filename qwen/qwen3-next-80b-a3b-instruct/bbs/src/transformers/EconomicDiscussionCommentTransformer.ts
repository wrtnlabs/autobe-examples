import { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EconomicDiscussionCommentTransformer {
  export type Payload = Prisma.economic_discussion_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        version: true,
        status: true,
        deletion_reason: true,
        article: true,
        author: true,
        deletingAdministrator: true,
      },
    } satisfies Prisma.economic_discussion_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicDiscussionComment> {
    return {
      content: input.content ?? null,
      postedTime: toISOStringSafe(input.created_at),
      economic_discussion_citizen_id: input.author.id,
    };
  }
}
