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
import { RedditLikeAttachmentAtSummaryTransformer } from "./RedditLikeAttachmentAtSummaryTransformer";

export namespace RedditLikeAttachmentReferenceAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_attachment_referencesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reference_type: true,
        created_at: true,
        attachment: RedditLikeAttachmentAtSummaryTransformer.select(),
        profileReference: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_like_attachment_reference_of_profilesFindManyArgs,
        communityReference: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_like_attachment_reference_of_communitiesFindManyArgs,
        postReference: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_like_attachment_reference_of_postsFindManyArgs,
      },
    } satisfies Prisma.reddit_like_attachment_referencesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeAttachmentReference.ISummary> {
    return {
      id: input.id,
      referenceType: input.reference_type as "profile" | "community" | "post",
      createdAt: input.created_at.toISOString(),
      attachment: await RedditLikeAttachmentAtSummaryTransformer.transform(
        input.attachment,
      ),
      profileId: input.profileReference?.id ?? null,
      communityId: input.communityReference?.id ?? null,
      postId: input.postReference?.id ?? null,
    };
  }
}
