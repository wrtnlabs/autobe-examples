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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeAttachmentReferences(props: {
  body: IRedditLikeAttachmentReference.IRequest;
}): Promise<IPageIRedditLikeAttachmentReference.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause dynamically
  const where: Prisma.reddit_like_attachment_referencesWhereInput = {};
  if (props.body.reference_type !== undefined) {
    where.reference_type = props.body.reference_type;
  }
  if (props.body.attachment_id !== undefined) {
    where.attachment_id = props.body.attachment_id;
  }
  if (
    props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
  ) {
    where.created_at = {};
    if (props.body.created_at_from !== undefined) {
      where.created_at.gte = new Date(props.body.created_at_from);
    }
    if (props.body.created_at_to !== undefined) {
      where.created_at.lte = new Date(props.body.created_at_to);
    }
  }
  // Handle entity-specific filters
  if (props.body.profile_id !== undefined) {
    where.profileReference = {
      profile_id: props.body.profile_id,
    } satisfies Prisma.reddit_like_attachment_reference_of_profilesWhereInput;
  }
  if (props.body.community_id !== undefined) {
    where.communityReference = {
      community_id: props.body.community_id,
    } satisfies Prisma.reddit_like_attachment_reference_of_communitiesWhereInput;
  }
  if (props.body.post_id !== undefined) {
    where.postReference = {
      post_id: props.body.post_id,
    } satisfies Prisma.reddit_like_attachment_reference_of_postsWhereInput;
  }
  // Query data with pagination - always include all subtype relations for computing IDs
  const data = await MyGlobal.prisma.reddit_like_attachment_references.findMany(
    {
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        reference_type: true,
        created_at: true,
        attachment: {
          select: {
            id: true,
            original_filename: true,
            mime_type: true,
            file_size_bytes: true,
            created_at: true,
            uploadedByMember: {
              select: {
                id: true,
                email: true,
                username: true,
                email_verified: true,
                created_at: true,
              },
            },
          },
        },
        profileReference: {
          select: {
            profile_id: true,
          },
        },
        communityReference: {
          select: {
            community_id: true,
          },
        },
        postReference: {
          select: {
            post_id: true,
          },
        },
      },
    },
  );
  // Get total count
  const total = await MyGlobal.prisma.reddit_like_attachment_references.count({
    where,
  });
  // Transform results
  const transformedData: IRedditLikeAttachmentReference.ISummary[] =
    await Promise.all(
      data.map(async (item) => {
        const profileId = item.profileReference?.profile_id ?? null;
        const communityId = item.communityReference?.community_id ?? null;
        const postId = item.postReference?.post_id ?? null;
        return {
          id: item.id,
          referenceType: item.reference_type as
            | "profile"
            | "community"
            | "post",
          createdAt: item.created_at.toISOString(),
          profileId: profileId as (string & tags.Format<"uuid">) | null,
          communityId: communityId as (string & tags.Format<"uuid">) | null,
          postId: postId as (string & tags.Format<"uuid">) | null,
          attachment: {
            id: item.attachment.id,
            originalFilename: item.attachment.original_filename,
            mimeType: item.attachment.mime_type,
            fileSizeBytes: item.attachment.file_size_bytes,
            createdAt: item.attachment.created_at.toISOString(),
            uploadedByMember: {
              id: item.attachment.uploadedByMember.id,
              email: item.attachment.uploadedByMember.email,
              username: item.attachment.uploadedByMember.username,
              emailVerified: item.attachment.uploadedByMember.email_verified,
              createdAt:
                item.attachment.uploadedByMember.created_at.toISOString(),
            } satisfies IRedditLikeMember.ISummary,
          } satisfies IRedditLikeAttachment.ISummary,
        } satisfies IRedditLikeAttachmentReference.ISummary;
      }),
    );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditLikeAttachmentReference.ISummary;
}
