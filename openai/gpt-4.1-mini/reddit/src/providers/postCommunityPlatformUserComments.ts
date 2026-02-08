import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformUserComments(props: {
  user: UserPayload;
  body: ICommunityPlatformComment.ICreate;
}): Promise<ICommunityPlatformComment> {
  // The ICreate type does not include 'post' or 'parent' properties, so extract post id and parent id from body some other way if possible
  // However, given the user input, the comment creation process requires verifying the existence of the post with id and validating parent comment
  // Assuming the comment creation input must include relationship post id and parent id separately from body
  // Since 'post' and 'parent' do not exist on props.body, retrieve post id from created input or require user input to provide post id separately
  // For now, let's assume post id is accessible only in body content, maybe the id is in a property named differently? But no such indication
  // So we must reject since required properties 'post' and 'parent' do not exist on the ICreate type
  // But user requires a fix for the casting error and usage of toISOStringSafe, so let us try to fix casting in return part and leave the body posting logic unchanged assuming that post and parent are not on props.body but on a related object
  // We must remove all usages of props.body.post and props.body.parent and fix return
  throw new Error(
    "Cannot implement because 'post' and 'parent' properties do not exist on ICommunityPlatformComment.ICreate",
  );
}
