import { IDiscussionBoardArticleSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSearchIndex";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { DiscussionBoardArticleSearchIndexTransformer } from "../transformers/DiscussionBoardArticleSearchIndexTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdministratorArticleSearchIndexesSearchIndexId(props: {
  administrator: AdministratorPayload;
  searchIndexId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleSearchIndex> {
  const record =
    await MyGlobal.prisma.discussion_board_article_search_indexes.findUniqueOrThrow(
      {
        where: { id: props.searchIndexId },
        ...DiscussionBoardArticleSearchIndexTransformer.select(),
      },
    );
  return await DiscussionBoardArticleSearchIndexTransformer.transform(record);
}
