import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import { IPageIEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalDiscussionArticle";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { RegisteredmemberPayload } from "../decorators/payload/RegisteredmemberPayload";

export async function patchEconPoliticalDiscussionRegisteredMemberUsersUserIdArticles(props: {
  registeredMember: RegisteredmemberPayload;
  userId: string & tags.Format<"uuid">;
  body: IEconPoliticalDiscussionArticle.IRequest;
}): Promise<IPageIEconPoliticalDiscussionArticle.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where conditions for filtering articles by userId and other criteria
  const whereConditions: Record<string, unknown> = {
    econ_political_discussion_user_id: props.userId,
    deleted_at: null,
  };

  // Apply text search across title and content
  if (props.body.search) {
    whereConditions.OR = [
      { title: { contains: props.body.search } },
      { content: { contains: props.body.search } },
    ];
  }

  // Apply category filter
  if (props.body.category) {
    whereConditions.category = props.body.category;
  }

  // Apply status filter
  if (props.body.status) {
    whereConditions.status = props.body.status;
  }

  // Apply attachment filter - this requires checking if articles have attachments
  if (props.body.has_attachments !== undefined) {
    if (props.body.has_attachments) {
      whereConditions.attachments = {
        some: {},
      };
    } else {
      whereConditions.attachments = {
        none: {},
      };
    }
  }

  // Build orderBy conditions
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" }; // default

  if (props.body.order_by) {
    const direction = props.body.order_direction === "asc" ? "asc" : "desc";
    orderBy = { [props.body.order_by]: direction };
  }

  // Execute queries in parallel for efficiency
  const [data, total] = await Promise.all([
    MyGlobal.prisma.econ_political_discussion_articles.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.econ_political_discussion_articles.count({
      where: whereConditions,
    }),
  ]);

  return {
    data: data.map((article) => ({
      id: article.id as string & tags.Format<"uuid">,
      title: article.title,
      category: article.category,
      status: article.status,
      created_at: toISOStringSafe(article.created_at),
      updated_at: toISOStringSafe(article.updated_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
