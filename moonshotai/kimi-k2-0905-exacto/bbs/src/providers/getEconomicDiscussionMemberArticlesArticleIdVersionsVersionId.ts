import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionArticleVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleVersion";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getEconomicDiscussionMemberArticlesArticleIdVersionsVersionId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  versionId: string & tags.Format<"uuid">;
}): Promise<IEconomicDiscussionArticleVersion> {
  const version =
    await MyGlobal.prisma.economic_discussion_article_versions.findUnique({
      where: { id: props.versionId },
    });

  if (!version) {
    throw new HttpException("Version not found", 404);
  }

  if (version.economic_discussion_article_id !== props.articleId) {
    throw new HttpException(
      "Version does not belong to specified article",
      404,
    );
  }

  return {
    id: version.id as string & tags.Format<"uuid">,
    economic_discussion_article_id:
      version.economic_discussion_article_id as string & tags.Format<"uuid">,
    title: version.title,
    content: version.content,
    version: version.version as number & tags.Type<"int32">,
    created_at: toISOStringSafe(version.created_at),
  };
}
