import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentReference";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeAttachmentReferenceTransformer } from "../transformers/RedditLikeAttachmentReferenceTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeAttachmentReferencesReferenceId(props: {
  referenceId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeAttachmentReference> {
  const reference =
    await MyGlobal.prisma.reddit_like_attachment_references.findUniqueOrThrow({
      where: { id: props.referenceId },
      ...RedditLikeAttachmentReferenceTransformer.select(),
    });
  return await RedditLikeAttachmentReferenceTransformer.transform(reference);
}
