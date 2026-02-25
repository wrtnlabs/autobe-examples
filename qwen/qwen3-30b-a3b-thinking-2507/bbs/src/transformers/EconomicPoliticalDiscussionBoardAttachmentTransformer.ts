import { IEconomicPoliticalDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardArticle";
import { IEconomicPoliticalDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardAttachment";
import { IEconomicPoliticalDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardSection";
import { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EconomicPoliticalDiscussionBoardArticleAtSummaryTransformer } from "./EconomicPoliticalDiscussionBoardArticleAtSummaryTransformer";

export namespace EconomicPoliticalDiscussionBoardAttachmentTransformer {
  export type Payload =
    Prisma.economic_political_discussion_board_attachmentsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        url: true,
        type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        article:
          EconomicPoliticalDiscussionBoardArticleAtSummaryTransformer.select(),
      },
    } satisfies Prisma.economic_political_discussion_board_attachmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicPoliticalDiscussionBoardAttachment> {
    return {
      id: input.id,
      url: input.url,
      type: typia.assert<"file" | "image">(input.type),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      article:
        await EconomicPoliticalDiscussionBoardArticleAtSummaryTransformer.transform(
          input.article,
        ),
    };
  }
}
