import { IDiscussionBoardArticleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFavorite";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleFavorite";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardArticleFavoriteAtSummaryTransformer } from "../transformers/DiscussionBoardArticleFavoriteAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardMemberFavorites(props: {
  member: MemberPayload;
  body: IDiscussionBoardArticleFavorite.IRequest;
}): Promise<IPageIDiscussionBoardArticleFavorite.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    discussion_board_member_id: props.member.id,
    ...(props.body.category !== undefined &&
    props.body.category !== null &&
    props.body.category.trim() !== ""
      ? { category: props.body.category }
      : {}),
    ...(props.body.search !== undefined && props.body.search.trim() !== ""
      ? { notes: { contains: props.body.search, mode: "insensitive" as const } }
      : {}),
  } satisfies Prisma.discussion_board_article_favoritesWhereInput;
  const data =
    await MyGlobal.prisma.discussion_board_article_favorites.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...DiscussionBoardArticleFavoriteAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.discussion_board_article_favorites.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardArticleFavoriteAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
