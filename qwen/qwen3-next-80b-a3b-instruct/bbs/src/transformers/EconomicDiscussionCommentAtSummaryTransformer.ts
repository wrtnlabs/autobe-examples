import { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EconomicDiscussionCitizenAtSummaryTransformer } from "./EconomicDiscussionCitizenAtSummaryTransformer";

export namespace EconomicDiscussionCommentAtSummaryTransformer {
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
        // Reuse neighbor transformer for author
        author: EconomicDiscussionCitizenAtSummaryTransformer.select(),
        deletingAdministrator: true,
      },
    } satisfies Prisma.economic_discussion_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicDiscussionComment.ISummary> {
    return {
      id: input.id,
      content: input.content,
      createdAt: toISOStringSafe(input.created_at),
      // Reuse neighbor transformer for author
      author: await EconomicDiscussionCitizenAtSummaryTransformer.transform(
        input.author,
      ),
    };
  }
}
