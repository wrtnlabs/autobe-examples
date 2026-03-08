import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardArticleFileTransformer } from "./DiscussionBoardArticleFileTransformer";
import { DiscussionBoardArticleTagAtSummaryTransformer } from "./DiscussionBoardArticleTagAtSummaryTransformer";
import { DiscussionBoardMemberAtSummaryTransformer } from "./DiscussionBoardMemberAtSummaryTransformer";
import { DiscussionBoardSectionAtSummaryTransformer } from "./DiscussionBoardSectionAtSummaryTransformer";

export namespace DiscussionBoardArticleTransformer {
  export type Payload = Prisma.discussion_board_articlesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        content: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: DiscussionBoardMemberAtSummaryTransformer.select(),
        section: DiscussionBoardSectionAtSummaryTransformer.select(),
        files: DiscussionBoardArticleFileTransformer.select(),
        taggings: DiscussionBoardArticleTagAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_articlesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticle> {
    return {
      id: input.id,
      title: input.title,
      content: input.content,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at?.toISOString() ?? null,
      deleted_at: input.deleted_at?.toISOString() ?? null,
      author: await DiscussionBoardMemberAtSummaryTransformer.transform(
        input.author,
      ),
      section: await DiscussionBoardSectionAtSummaryTransformer.transform(
        input.section,
      ),
      files: await Promise.all(
        input.files.map(DiscussionBoardArticleFileTransformer.transform),
      ),
      taggings: await Promise.all(
        input.taggings.map((tag) =>
          DiscussionBoardArticleTagAtSummaryTransformer.transform(tag),
        ),
      ),
    };
  }
}
