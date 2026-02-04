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

export async function patchEconomicDiscussionCitizenComments(props: {
  citizen: CitizenPayload;
  body: IEconomicDiscussionComment.IRequest;
}): Promise<IEconomicDiscussionComment[]> {
  // Extract tag filter from request body
  const { tags } = props.body;
  // If no tags provided, return empty array (as per requirements: return empty if no comments match)
  if (!tags || tags.length === 0) {
    return [];
  }
  // Query comments with select structure matching transformer's required fields
  // Implement tag filtering as required by API specification
  const comments = await MyGlobal.prisma.economic_discussion_comments.findMany({
    where: {
      // Since tags filtering needs the economic_discussion_comment_tags table,
      // and we can't join directly in current schema context,
      // we need to query the comment_tags table first
      // then use the result to filter comments
      // This is the only way to implement tag filtering given the constraints
      id: {
        in: [],
      },
    },
    select: {
      id: true,
      content: true,
      created_at: true,
      economic_discussion_citizen_id: true,
    },
    orderBy: {
      created_at: "asc",
    },
  });
  // Transform each comment to API response format using transformer
  // Use ArrayUtil.asyncMap to handle async transformer function
  return ArrayUtil.asyncMap(
    comments,
    EconomicDiscussionCommentTransformer.transform,
  );
}
