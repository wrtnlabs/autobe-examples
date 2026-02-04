import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEconomicDiscussionCitizenCommentsCommentId(props: {
  citizen: CitizenPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify comment exists and is owned by the citizen
  const comment = await MyGlobal.prisma.economic_discussion_comments.findUnique(
    {
      where: {
        id: props.commentId,
        writer_id: props.citizen.id, // Use writer_id as scalar field based on schema analysis
      },
    },
  );
  // If comment doesn't exist or doesn't belong to citizen, throw 404
  if (!comment) {
    throw new HttpException("Comment not found or access denied", 404);
  }
  // Perform hard delete
  await MyGlobal.prisma.economic_discussion_comments.delete({
    where: {
      id: props.commentId,
    },
  });
}
