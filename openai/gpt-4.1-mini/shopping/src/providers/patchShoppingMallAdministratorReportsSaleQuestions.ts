import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSaleQuestionReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleQuestionReport";
import { IShoppingMallSaleQuestionReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestionReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorReportsSaleQuestions(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallSaleQuestionReport.IRequest;
}): Promise<IPageIShoppingMallSaleQuestionReport.ISummary> {
  const {
    page = 1,
    limit = 20,
    sortBy = "lastAskedAt",
    sortOrder = "asc",
    sellerId,
    status,
    dateFrom,
    dateTo,
    search,
  } = props.body;
  const skip = (page - 1) * limit;
  const allowedSortBy = [
    "lastAskedAt",
    "questionCount",
    "pendingCount",
    "answeredCount",
    "rejectedCount",
  ];
  const allowedSortOrder = ["asc", "desc"];
  const orderByField = allowedSortBy.includes(sortBy) ? sortBy : "lastAskedAt";
  const orderByDirection = allowedSortOrder.includes(sortOrder)
    ? sortOrder
    : "asc";
  const whereConditions: Prisma.shopping_mall_sale_questionsWhereInput = {};
  if (sellerId) {
    whereConditions.sale = { seller_id: sellerId };
  }
  if (status) {
    whereConditions.status = status;
  }
  if (dateFrom || dateTo) {
    const createdAtCondition: Prisma.DateTimeFilter = {};
    if (dateFrom) {
      createdAtCondition.gte = new Date(dateFrom);
    }
    if (dateTo) {
      createdAtCondition.lte = new Date(dateTo);
    }
    whereConditions.created_at = createdAtCondition;
  }
  if (search) {
    whereConditions.OR = [
      { title: { contains: search } },
      { body: { contains: search } },
    ];
  }
  const groupResult =
    await MyGlobal.prisma.shopping_mall_sale_questions.groupBy({
      by: ["shopping_mall_sale_id"],
      where: whereConditions,
      _count: {
        _all: true,
        status: true,
      },
      orderBy: {
        _max: { created_at: orderByDirection },
      },
      take: limit,
      skip: skip,
    });
  const totalCount = await MyGlobal.prisma.shopping_mall_sale_questions.count({
    where: whereConditions,
  });
  const data: IShoppingMallSaleQuestionReport.ISummary[] = await Promise.all(
    groupResult.map(async (grp) => {
      const lastAskedAt =
        await MyGlobal.prisma.shopping_mall_sale_questions.findFirst({
          where: { shopping_mall_sale_id: grp.shopping_mall_sale_id },
          orderBy: { created_at: "desc" },
          select: { created_at: true },
        });
      // Use fallback fallbackDate for toISOStringSafe to avoid passing null
      const fallbackDate = new Date(0);
      const lastAskedDate = lastAskedAt?.created_at ?? fallbackDate;
      const lastAskedAtStr: string & tags.Format<"date-time"> =
        toISOStringSafe(lastAskedDate);
      return {
        id: grp.shopping_mall_sale_id as string & tags.Format<"uuid">,
        saleId: grp.shopping_mall_sale_id,
        questionCount: grp._count?._all ?? 0,
        pendingCount: 0,
        answeredCount: 0,
        rejectedCount: 0,
        lastAskedAt: lastAskedAtStr,
      };
    }),
  );
  const saleIds = groupResult.map((grp) => grp.shopping_mall_sale_id);
  if (saleIds.length > 0) {
    const pendingCountsRaw =
      await MyGlobal.prisma.shopping_mall_sale_questions.groupBy({
        by: ["shopping_mall_sale_id"],
        where: { shopping_mall_sale_id: { in: saleIds }, status: "pending" },
        _count: { _all: true },
      });
    const answeredCountsRaw =
      await MyGlobal.prisma.shopping_mall_sale_questions.groupBy({
        by: ["shopping_mall_sale_id"],
        where: { shopping_mall_sale_id: { in: saleIds }, status: "answered" },
        _count: { _all: true },
      });
    const rejectedCountsRaw =
      await MyGlobal.prisma.shopping_mall_sale_questions.groupBy({
        by: ["shopping_mall_sale_id"],
        where: { shopping_mall_sale_id: { in: saleIds }, status: "rejected" },
        _count: { _all: true },
      });
    const pendingCounts = new Map<string, number>();
    for (const rec of pendingCountsRaw) {
      if (rec._count)
        pendingCounts.set(rec.shopping_mall_sale_id, rec._count._all ?? 0);
    }
    const answeredCounts = new Map<string, number>();
    for (const rec of answeredCountsRaw) {
      if (rec._count)
        answeredCounts.set(rec.shopping_mall_sale_id, rec._count._all ?? 0);
    }
    const rejectedCounts = new Map<string, number>();
    for (const rec of rejectedCountsRaw) {
      if (rec._count)
        rejectedCounts.set(rec.shopping_mall_sale_id, rec._count._all ?? 0);
    }
    for (const report of data) {
      report.pendingCount = pendingCounts.get(report.saleId) ?? 0;
      report.answeredCount = answeredCounts.get(report.saleId) ?? 0;
      report.rejectedCount = rejectedCounts.get(report.saleId) ?? 0;
    }
  }
  return {
    pagination: {
      current: page,
      limit: limit,
      records: totalCount,
      pages: totalCount === 0 ? 0 : Math.ceil(totalCount / limit),
    },
    data,
  };
}
