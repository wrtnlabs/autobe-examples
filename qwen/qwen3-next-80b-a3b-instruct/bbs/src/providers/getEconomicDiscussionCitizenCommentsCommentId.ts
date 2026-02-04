import { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";
import { EconomicDiscussionCommentTransformer } from "../transformers/EconomicDiscussionCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicDiscussionCitizenCommentsCommentId(props: {
  citizen: CitizenPayload;
  commentId: string;
}): Promise<IEconomicDiscussionComment> {
  const comment = await MyGlobal.prisma.economic_discussion_comments.findUnique(
    {
      where: { id: props.commentId },
      ...EconomicDiscussionCommentTransformer.select(),
    },
  );
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  return await EconomicDiscussionCommentTransformer.transform(comment);
}
