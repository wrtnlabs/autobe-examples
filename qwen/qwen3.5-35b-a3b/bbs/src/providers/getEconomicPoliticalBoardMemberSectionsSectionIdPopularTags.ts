import { IEconomicPoliticalBoardSectionPopularTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSectionPopularTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicPoliticalBoardMemberSectionsSectionIdPopularTags(props: {
  member: MemberPayload;
  sectionId: string & tags.Format<"uuid">;
}): Promise<IEconomicPoliticalBoardSectionPopularTag.ISummary[]> {
  await MyGlobal.prisma.economic_political_board_sections.findUniqueOrThrow({
    where: {
      id: props.sectionId,
      deleted_at: null,
    },
  });
  const articleTags =
    await MyGlobal.prisma.economic_political_board_article_tags.groupBy({
      by: ["tag_id"],
      where: {
        article: {
          section_id: props.sectionId,
          deleted_at: null,
        },
        tag: {
          deleted_at: null,
        },
      },
      _count: {
        article_id: true,
      },
      orderBy: {
        _count: {
          article_id: "desc",
        },
      },
    });
  const tags = await MyGlobal.prisma.economic_political_board_tags.findMany({
    where: {
      id: {
        in: articleTags.map((at) => at.tag_id),
      },
    },
  });
  const tagMap = new Map(tags.map((tag) => [tag.id, tag.name]));
  return articleTags.map((at) => ({
    tagName: tagMap.get(at.tag_id)!,
    articleCount: at._count.article_id as number & tags.Type<"int32">,
  })) satisfies IEconomicPoliticalBoardSectionPopularTag.ISummary[];
}
