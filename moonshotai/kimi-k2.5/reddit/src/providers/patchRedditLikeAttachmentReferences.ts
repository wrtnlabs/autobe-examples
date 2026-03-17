import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeAttachmentReference";
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
import { RedditLikeAttachmentReferenceAtSummaryTransformer } from "../transformers/RedditLikeAttachmentReferenceAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeAttachmentReferences(props: {
  body: IRedditLikeAttachmentReference.IRequest;
}): Promise<IPageIRedditLikeAttachmentReference.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.reddit_like_attachment_referencesWhereInput = {
    ...(props.body.reference_type !== undefined && {
      reference_type: props.body.reference_type,
    }),
    ...(props.body.attachment_id !== undefined && {
      attachment_id: props.body.attachment_id,
    }),
    ...(props.body.created_at_from !== undefined && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: { lte: new Date(props.body.created_at_to) },
    }),
    ...(props.body.profile_id !== undefined && {
      profileReference: {
        profile_id: props.body.profile_id,
      },
    }),
    ...(props.body.community_id !== undefined && {
      communityReference: {
        community_id: props.body.community_id,
      },
    }),
    ...(props.body.post_id !== undefined && {
      postReference: {
        post_id: props.body.post_id,
      },
    }),
  };
  const data = await MyGlobal.prisma.reddit_like_attachment_references.findMany(
    {
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...RedditLikeAttachmentReferenceAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.reddit_like_attachment_references.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditLikeAttachmentReferenceAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
