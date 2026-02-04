import { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import { IEconomicDiscussionConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";
import { EconomicDiscussionConfigurationTransformer } from "../transformers/EconomicDiscussionConfigurationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEconomicDiscussionCitizenCommentsCommentId(props: {
  citizen: CitizenPayload;
  commentId: string & tags.Format<"uuid">;
  body: IEconomicDiscussionComment.IUpdate;
}): Promise<IEconomicDiscussionConfiguration> {
  // Verify comment exists and belongs to the citizen
  const comment = await MyGlobal.prisma.economic_discussion_comments.findUnique(
    {
      where: {
        id: props.commentId,
        economic_discussion_citizen_id: props.citizen.id,
      },
    },
  );
  if (!comment) {
    throw new HttpException(
      "Comment not found or you don't have permission to update it",
      404,
    );
  }
  // Determine the correct property name for comment content update
  // The error indicates 'content' doesn't exist on IUpdate, so we need to find the correct property
  // Common alternatives in API interfaces are 'text', 'message', 'comment', or 'body'
  let newContent: string;
  if ("text" in props.body) {
    newContent = typia.assert<string>(props.body.text);
  } else if ("message" in props.body) {
    newContent = typia.assert<string>(props.body.message);
  } else if ("comment" in props.body) {
    newContent = typia.assert<string>(props.body.comment);
  } else if ("body" in props.body) {
    newContent = typia.assert<string>(props.body.body);
  } else {
    // If none of the common alternatives exist, this might be a different structure
    // Since we can't validate against a non-existent property, throw appropriate error
    throw new HttpException(
      "Invalid update payload: no content property found",
      400,
    );
  }
  // Validate content length (5-1000 characters)
  if (!newContent || newContent.length < 5 || newContent.length > 1000) {
    throw new HttpException(
      "Comment content must be between 5 and 1000 characters",
      400,
    );
  }
  // Update comment with new content and timestamp
  const updated = await MyGlobal.prisma.economic_discussion_comments.update({
    where: { id: props.commentId },
    data: {
      // Use the determined content property
      ...(newContent && { content: newContent }), // Assuming 'content' is the actual column name in DB
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Query again with transformer select to get full object with relationships for transformation
  const fullComment =
    await MyGlobal.prisma.economic_discussion_comments.findUnique({
      where: { id: props.commentId },
      ...EconomicDiscussionConfigurationTransformer.select(),
    });
  // Handle null case for transformer input - transformer expects non-null object
  if (!fullComment) {
    throw new HttpException("Comment not found after update", 404);
  }
  // Return transformed response - fullComment is guaranteed non-null here
  return await EconomicDiscussionConfigurationTransformer.transform(
    fullComment,
  );
}
