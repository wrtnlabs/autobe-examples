import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentReference";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeAttachmentTransformer } from "./RedditLikeAttachmentTransformer";

export namespace RedditLikeAttachmentReferenceTransformer {
  export type Payload = Prisma.reddit_like_attachment_referencesGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeAttachmentReference> {
    return {
      id: input.id,
      referenceType: input.reference_type,
      createdAt: input.created_at.toISOString(),
      attachment: await RedditLikeAttachmentTransformer.transform(
        input.attachment,
      ),
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        reference_type: true,
        created_at: true,
        attachment: RedditLikeAttachmentTransformer.select(),
      },
    } satisfies Prisma.reddit_like_attachment_referencesFindManyArgs;
  }
}
