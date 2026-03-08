import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardArticle";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer } from "../transformers/EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer";
import { EconomicPoliticalBoardSectionAtSummaryTransformer } from "../transformers/EconomicPoliticalBoardSectionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicPoliticalBoardGuestArticles(props: {
  guest: GuestPayload;
  body: IEconomicPoliticalBoardArticle.IRequest;
}): Promise<IPageIEconomicPoliticalBoardArticle.ISummary> {
  const page = props.body.page ?? 1;
  const pageSize = props.body.pageSize ?? 20;
  const limit = props.body.limit ?? pageSize;
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  const effectiveLimit = Math.min(limit, 50);
  const skip = (page - 1) * effectiveLimit;
  const whereInput: Prisma.economic_political_board_articlesWhereInput = {
    deleted_at: null,
  };
  if (props.body.sectionId) {
    const sectionExists =
      await MyGlobal.prisma.economic_political_board_sections.findFirst({
        where: {
          id: props.body.sectionId,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (!sectionExists) {
      throw new HttpException("Section not found", 404);
    }
    whereInput.section_id = props.body.sectionId;
  }
  if (props.body.tagId) {
    const tagExists =
      await MyGlobal.prisma.economic_political_board_tags.findFirst({
        where: {
          id: props.body.tagId,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (!tagExists) {
      throw new HttpException("Tag not found", 404);
    }
    whereInput.articleTags = {
      some: {
        tag_id: props.body.tagId,
      },
    };
  }
  if (props.body.search) {
    whereInput.OR = [
      {
        title: {
          contains: props.body.search,
          mode: "insensitive",
        },
      },
      {
        content: {
          contains: props.body.search,
          mode: "insensitive",
        },
      },
    ];
  }
  const orderByInput = props.body.sort
    ? { [props.body.sort]: props.body.sortOrder ?? ("desc" as const) }
    : { created_at: "desc" as const };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.economic_political_board_articles.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: effectiveLimit,
      include: {
        author:
          EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer.select(),
        section: EconomicPoliticalBoardSectionAtSummaryTransformer.select(),
      },
    }),
    MyGlobal.prisma.economic_political_board_articles.count({
      where: whereInput,
    }),
  ]);
  const transformedData: IEconomicPoliticalBoardArticle.ISummary[] =
    await ArrayUtil.asyncMap(data, async (record) => {
      return {
        id: record.id as string & tags.Format<"uuid">,
        title: record.title,
        author:
          await EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer.transform(
            record.author,
          ),
        section:
          await EconomicPoliticalBoardSectionAtSummaryTransformer.transform(
            record.section,
          ),
        created_at: toISOStringSafe(record.created_at),
        updated_at: toISOStringSafe(record.updated_at),
        deleted_at: record.deleted_at
          ? toISOStringSafe(record.deleted_at)
          : null,
      } satisfies IEconomicPoliticalBoardArticle.ISummary;
    });
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: effectiveLimit,
      records: total,
      pages: Math.ceil(total / effectiveLimit),
    } satisfies IPage.IPagination,
  };
}
