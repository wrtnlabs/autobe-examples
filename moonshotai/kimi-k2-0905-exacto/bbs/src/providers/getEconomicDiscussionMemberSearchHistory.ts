import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageIEconomicDiscussionSearchHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionSearchHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICrIPageIntegerRequired } from "@ORGANIZATION/PROJECT-api/lib/structures/ICrIPageIntegerRequired";
import { IEconomicDiscussionSearchHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSearchHistory";
import { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import { IEconomicDiscussionSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSearchQuery";
import { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";
import { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import { IEconomicDiscussionSearchMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSearchMetadata";
import { IEconomicDiscussionSearchFilters } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSearchFilters";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getEconomicDiscussionMemberSearchHistory(props: {
  member: MemberPayload;
}): Promise<IPageIEconomicDiscussionSearchHistory> {
  // Use reasonable pagination defaults for member search history
  const page = 1;
  const limit = 50;
  const skip = (page - 1) * limit;

  // Query search history for the authenticated member
  const [historyRecords, total] = await Promise.all([
    MyGlobal.prisma.economic_discussion_search_history.findMany({
      where: {
        economic_discussion_member_id: props.member.id,
      },
      include: {
        searchQuery: true,
      },
      orderBy: {
        created_at: "desc",
      },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.economic_discussion_search_history.count({
      where: {
        economic_discussion_member_id: props.member.id,
      },
    }),
  ]);

  // Transform to response format
  const data: IEconomicDiscussionSearchHistory[] = historyRecords.map(
    (record) => ({
      id: record.id as string & tags.Format<"uuid">,
      economic_discussion_member_id:
        record.economic_discussion_member_id as string & tags.Format<"uuid">,
      economic_discussion_search_query_id:
        record.economic_discussion_search_query_id as string &
          tags.Format<"uuid">,
      query_text: record.query_text,
      created_at: toISOStringSafe(record.created_at) satisfies string as string,
      member: undefined, // Optional field - could be populated if needed
      searchQuery: undefined, // Optional field - searchQuery summary would require additional data
    }),
  );

  return {
    data,
    pagination: {
      current: page.toString() satisfies string as string,
      limit: limit.toString() satisfies string as string,
      records: total.toString() satisfies string as string,
      pages: Math.ceil(total / limit).toString() satisfies string as string,
    },
  };
}
