import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeMemberEmailVerification";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeMemberEmailVerificationAtSummaryTransformer } from "../transformers/RedditLikeMemberEmailVerificationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeMemberEmailVerifications(props: {
  member: MemberPayload;
  body: IRedditLikeMemberEmailVerification.IRequest;
}): Promise<IPageIRedditLikeMemberEmailVerification.ISummary> {
  // Parse pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Current time for status filtering (internal use only, not in return types)
  const now = new Date();
  // Build dynamic where clause based on request filters
  const where: Prisma.reddit_like_member_email_verificationsWhereInput = {
    // Soft delete filter: exclude deleted records unless include_deleted is true
    ...(props.body.include_deleted === true ? {} : { deleted_at: null }),
    // Member ID filter (exact match)
    ...(props.body.reddit_like_member_id && {
      reddit_like_member_id: props.body.reddit_like_member_id,
    }),
    // Email filter (partial match, case-insensitive)
    ...(props.body.email && {
      email: {
        contains: props.body.email,
        mode: "insensitive",
      },
    }),
    // Created at date range filter
    ...(props.body.created_at_from || props.body.created_at_to
      ? {
          created_at: {
            ...(props.body.created_at_from && {
              gte: new Date(props.body.created_at_from),
            }),
            ...(props.body.created_at_to && {
              lte: new Date(props.body.created_at_to),
            }),
          },
        }
      : {}),
    // Expires at date range filter
    ...(props.body.expires_at_from || props.body.expires_at_to
      ? {
          expires_at: {
            ...(props.body.expires_at_from && {
              gte: new Date(props.body.expires_at_from),
            }),
            ...(props.body.expires_at_to && {
              lte: new Date(props.body.expires_at_to),
            }),
          },
        }
      : {}),
    // Status filter (computed based on deleted_at and expires_at)
    ...(props.body.status
      ? props.body.status === "pending"
        ? { deleted_at: null, expires_at: { gt: now } }
        : props.body.status === "verified"
          ? { deleted_at: { not: null } }
          : props.body.status === "expired"
            ? { deleted_at: null, expires_at: { lt: now } }
            : {}
      : {}),
  } satisfies Prisma.reddit_like_member_email_verificationsWhereInput;
  // Build order by clause
  const sortField = props.body.sort ?? "created_at";
  const orderDirection: "asc" | "desc" =
    props.body.order === "asc" ? "asc" : "desc";
  const orderBy: Prisma.reddit_like_member_email_verificationsOrderByWithRelationInput =
    {
      [sortField]: orderDirection,
    } satisfies Prisma.reddit_like_member_email_verificationsOrderByWithRelationInput;
  // Fetch paginated records
  const records =
    await MyGlobal.prisma.reddit_like_member_email_verifications.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...RedditLikeMemberEmailVerificationAtSummaryTransformer.select(),
    });
  // Get total count for pagination metadata
  const total =
    await MyGlobal.prisma.reddit_like_member_email_verifications.count({
      where,
    });
  // Transform and return paginated response
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      RedditLikeMemberEmailVerificationAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditLikeMemberEmailVerification.ISummary;
}
