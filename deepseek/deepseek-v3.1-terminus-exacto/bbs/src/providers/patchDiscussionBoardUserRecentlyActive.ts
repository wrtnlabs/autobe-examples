import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe"

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { UserPayload } from "../decorators/payload/UserPayload"

nimport;


{
    IDiscussionBoardAdministratorPromotionRequest;
}
from;
"@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
nimport;


{
    IDiscussionBoardArticle;
}
from;
"@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
nimport;


{
    IDiscussionBoardSection;
}
from;
"@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
nimport;


{
    IDiscussionBoardUser;
}
from;
"@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
nimport;


{
    IEntity;
}
from;
"@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
nimport;


{
    IPage;
}
from;
"@ORGANIZATION/PROJECT-api/lib/structures/IPage";
nimport;


{
    IPageIDiscussionBoardAdministratorDistributionStatistic;
}
from;
"@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
nimport;


{
    IPageIDiscussionBoardAdministratorPromotionRequest;
}
from;
"@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
nimport;


{
    IPageIDiscussionBoardArticle;
}
from;
"@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
nimport;


{
    IPageIDiscussionBoardSection;
}
from;
"@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
nimport;


{
    ArrayUtil;
}
from;
"@nestia/e2e";
nimport;


{
    HttpException;
}
from;
"@nestjs/common";
nimport;


{
    Prisma;
}
from;
"@prisma/sdk";
nimport;


jwt;
from;
"jsonwebtoken";
nimport;


typia, { tags };
from;
"typia";
nimport;


{
    v4;
}
from;
"uuid";
n;
nimport;


{
    MyGlobal;
}
from;
"../MyGlobal";
nimport;


{
    UserPayload;
}
from;
"../decorators/payload/UserPayload";
nimport;


{
    PasswordUtil;
}
from;
"../utils/PasswordUtil";
nimport;


{
    toISOStringSafe;
}
from;
"../utils/toISOStringSafe";
n;
nexport;
async function patchDiscussionBoardUserRecentlyActive(props: {}, n, user: UserPayload, n, body: IDiscussionBoardArticle.IRequest, n): Promise<IPageIDiscussionBoardArticle.ISummary> { n; const page = props.body.page ?? 1; n; const limit = props.body.limit ?? 100; n; const skip = (page - 1) * limit; n; const articlesWithRecentActivity = await MyGlobal.prisma.$queryRaw < , n, Array; <{}>n; id: string; n; title: string; n; status: string; n; created_at: Date; n; discussion_board_user_id: string; n; discussion_board_section_id: string; n; last_activity: Date; n; }
 > ;
n > `
    SELECT 
      a.id,
      a.title,
      a.status,
      a.created_at,
      a.discussion_board_user_id,
      a.discussion_board_section_id,
      COALESCE(MAX(c.created_at), a.created_at) as last_activity
    FROM discussion_board_articles a
    LEFT JOIN discussion_board_comments c ON a.id = c.discussion_board_article_id
    WHERE a.deleted_at IS NULL AND a.status = 'published'
    GROUP BY a.id, a.title, a.status, a.created_at, a.discussion_board_user_id,
      a.discussion_board_section_id
    ORDER BY last_activity DESC
    LIMIT ${limit} OFFSET ${skip}
  `;
n;
const totalResult = await MyGlobal.prisma.$queryRaw < , n, Array;
<{}>n;
count: bigint;
n;
 > ;
n > `
    SELECT COUNT(DISTINCT a.id) as count
    FROM discussion_board_articles a
    LEFT JOIN discussion_board_comments c ON a.id = c.discussion_board_article_id
    WHERE a.deleted_at IS NULL AND a.status = 'published'
  `;
n;
const total = Number(totalResult[0].count);
n;
const transformedArticles = await Promise.all(n, articlesWithRecentActivity.map(async (article) => { n; const author = await MyGlobal.prisma.discussion_board_users.findUnique({ n, where: { id: article.discussion_board_user_id }, n }); n; const section = , n, await, MyGlobal, prisma, discussion_board_sections, findUnique; ({ n, where: { id: article.discussion_board_section_id }, n }); n; if (!author || !section) {
    n;
    throw new HttpException("Related data not found", 404);
      }
      return {
        id: article.id as string & tags.Format<"uuid">,
        title: article.title,
        status: article.status,
        created_at: toISOStringSafe(article.created_at) as string &
          tags.Format<"date-time">,
        author: {
          id: author.id as string & tags.Format<"uuid">,
          display_name: author.display_name,
          bio: author.bio,
          created_at: toISOStringSafe(author.created_at) as string &
            tags.Format<"date-time">,
        } satisfies IDiscussionBoardUser.ISummary,
        section: {
          id: section.id as string & tags.Format<"uuid">,
          name: section.name,
          description: section.description,
          status: section.status,
          display_order: section.display_order,
          deleted_at: section.deleted_at
            ? (toISOStringSafe(section.deleted_at) as string &
                tags.Format<"date-time">)
            : null,
        } satisfies IDiscussionBoardSection.ISummary,
      } satisfies IDiscussionBoardArticle.ISummary;
    }),
  );
  return {
    data: transformedArticles,
    pagination: {
      current: page,
      size: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
);
} }));
