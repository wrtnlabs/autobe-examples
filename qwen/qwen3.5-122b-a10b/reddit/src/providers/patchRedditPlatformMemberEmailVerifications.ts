import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMemberEmailVerification";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformMemberEmailVerificationAtSummaryTransformer } from "../transformers/RedditPlatformMemberEmailVerificationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberEmailVerifications(props: {
  member: MemberPayload;
  body: IRedditPlatformMemberEmailVerification.IRequest;
}): Promise<IPageIRedditPlatformMemberEmailVerification.ISummary> {
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build where clause with authorization filter
  const whereInput: Prisma.reddit_platform_member_email_verificationsWhereInput =
    {
      deleted_at: null,
      reddit_platform_member_id: props.member.id,
      ...(props.body.status === "pending" && {
        verified_at: null,
      }),
      ...(props.body.status === "verified" && {
        verified_at: { not: null },
      }),
      ...(props.body.expires_at_from && {
        expires_at: {
          gte: new Date(props.body.expires_at_from),
        },
      }),
      ...(props.body.expires_at_to && {
        expires_at: {
          lte: new Date(props.body.expires_at_to),
        },
      }),
      ...(props.body.created_at_from && {
        created_at: {
          gte: new Date(props.body.created_at_from),
        },
      }),
      ...(props.body.created_at_to && {
        created_at: {
          lte: new Date(props.body.created_at_to),
        },
      }),
    } satisfies Prisma.reddit_platform_member_email_verificationsWhereInput;
  // Execute paginated query
  const data =
    await MyGlobal.prisma.reddit_platform_member_email_verifications.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...RedditPlatformMemberEmailVerificationAtSummaryTransformer.select(),
    });
  // Execute count query
  const total =
    await MyGlobal.prisma.reddit_platform_member_email_verifications.count({
      where: whereInput,
    });
  // Transform results
  const records = await Promise.all(
    data.map((record) =>
      RedditPlatformMemberEmailVerificationAtSummaryTransformer.transform(
        record,
      ),
    ),
  );
  // Return paginated response
  return {
    data: records,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditPlatformMemberEmailVerification.ISummary;
}
