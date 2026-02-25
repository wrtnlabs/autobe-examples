import { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardComment";
import { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";
import { EconomicBoardCommentTransformer } from "../transformers/EconomicBoardCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicBoardCitizenCommentsCommentId(props: {
  citizen: CitizenPayload;
  commentId: string;
  body: IEconomicBoardComment.IUpdate;
}): Promise<IEconomicBoardComment> {
  const comment =
    await MyGlobal.prisma.economic_board_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      ...EconomicBoardCommentTransformer.select(),
    });
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment was deleted", 410);
  }
  // Check authorization: must be author or administrator
  if (comment.author.id !== props.citizen.id) {
    // Check if user is administrator
    // Analysis files indicate administrator can edit any comment
    // We assume the incoming citizen payload indicates admin role if applicable
    // In production, this would be checked by auth middleware or role field
    // Since we have no explicit role field in CitizenPayload, we assume the auth system
    // has already ensured the citizen is either the author or admin
    // If we don't have role info, we'll assume the only valid case is author
    throw new HttpException("Forbidden", 403);
  }
  // Check 60-minute edit window
  const created = Date.parse(toISOStringSafe(comment.created_at));
  const updated = Date.parse(toISOStringSafe(comment.updated_at));
  const editWindowMs = 60 * 60 * 1000;
  if (updated - created > editWindowMs) {
    throw new HttpException("Edit window expired", 403);
  }
  await MyGlobal.prisma.economic_board_comments.update({
    where: { id: props.commentId },
    data: {
      content: props.body.content,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Re-fetch the complete comment with nested relationships after update
  const updatedComment =
    await MyGlobal.prisma.economic_board_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      ...EconomicBoardCommentTransformer.select(),
    });
  return await EconomicBoardCommentTransformer.transform(updatedComment);
}
