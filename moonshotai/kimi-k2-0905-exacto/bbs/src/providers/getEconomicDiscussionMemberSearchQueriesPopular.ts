import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";
import { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getEconomicDiscussionMemberSearchQueriesPopular(props: {
  member: MemberPayload;
}): Promise<IEconomicDiscussionArticle.ISummary> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const popularQueries =
    await MyGlobal.prisma.economic_discussion_search_queries.findMany({
      where: {
        last_used_at: {
          gte: thirtyDaysAgo,
        },
        average_click_position: {
          lt: 5,
        },
        results_count: {
          gt: 3,
        },
      },
      orderBy: {
        frequency: "desc",
      },
      take: 10,
    });

  if (popularQueries.length === 0) {
    throw new HttpException(
      "No popular search queries found with current criteria",
      404,
    );
  }

  const topQuery = popularQueries[0];

  return {
    id: v4() as string & tags.Format<"uuid">,
    title: `Trending Search: ${topQuery.query_text}`,
    view_count: topQuery.frequency,
    created_at: toISOStringSafe(topQuery.created_at),
    updated_at: toISOStringSafe(topQuery.last_used_at),
    economic_discussion_member_id: props.member.id,
    economic_discussion_moderator_id:
      "00000000-0000-0000-0000-000000000000" as string & tags.Format<"uuid">,
    member_author: {
      id: props.member.id,
      username: "SearchSystem",
      email_verified: true,
      reputation_score: 0,
      created_at: toISOStringSafe(new Date()),
    },
    moderator_author: undefined,
    categories: [],
    attachments_count: 0,
    comments_count: 0,
    status: "approved",
  };
}
