import { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleTagMapping";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardArticleTagMappings(props: {
  body: IDiscussionBoardArticleTagMapping.IRequest;
}): Promise<IPageIDiscussionBoardArticleTagMapping.ISummary> {
  const page: number & tags.Type<"int32"> & tags.Minimum<0> = 1;
  const limit: number & tags.Type<"int32"> & tags.Minimum<0> = 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
  } satisfies Prisma.discussion_board_article_tag_mappingsWhereInput;
  const data =
    await MyGlobal.prisma.discussion_board_article_tag_mappings.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
      select: {},
    });
  const total =
    await MyGlobal.prisma.discussion_board_article_tag_mappings.count({
      where: whereInput,
    });
  return {
    data: data.map(() => ({})),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
