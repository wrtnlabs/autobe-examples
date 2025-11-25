import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleOfMemberusersMemberAuthor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleOfMemberusersMemberAuthor";

export async function getDiscussionBoardArticlesArticleIdMemberAuthor(props: {
  articleId: string;
}): Promise<IDiscussionBoardArticleOfMemberusersMemberAuthor> {
  // Ensure the target article exists.
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: {
      id: props.articleId,
    },
  });

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  // Look up the member authorship link record for this article.
  // Use findFirst with a where filter on the foreign key field
  // `discussion_board_article_id`, which is allowed on the
  // WhereInput type and avoids the incorrect use of whereUniqueInput.
  const memberAuthorship =
    await MyGlobal.prisma.discussion_board_article_of_memberusers.findFirst({
      where: {
        discussion_board_article_id: props.articleId,
      },
    });

  if (!memberAuthorship) {
    // Article exists but there is no member authorship link; treat as
    // "no member author" from this endpoint's perspective.
    throw new HttpException("Member author not found for this article", 404);
  }

  // From the diagnostic, the authorship record has a
  // `discussion_board_memberuser_id` foreign key field that links to the
  // member user profile.
  const memberUser =
    await MyGlobal.prisma.discussion_board_memberusers.findUnique({
      where: {
        id: memberAuthorship.discussion_board_memberuser_id,
      },
    });

  if (!memberUser) {
    // Integrity issue: authorship references a non-existent member user.
    // Expose this as a simple not-found error without leaking details.
    throw new HttpException("Member author not found", 404);
  }

  // Map Prisma model to the public DTO projection.
  return {
    id: memberUser.id,
    displayName: memberUser.display_name,
    bio: memberUser.bio === null ? undefined : memberUser.bio,
    location: memberUser.location === null ? undefined : memberUser.location,
  };
}
