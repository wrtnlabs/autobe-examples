import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostTextContent";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditClonePostTextContentAtSummaryTransformer } from "../transformers/RedditClonePostTextContentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberSubscriptions(props: {
  member: MemberPayload;
  body: IRedditClonePostTextContent.IRequest;
}): Promise<IPageIRedditClonePostTextContent.ISummary> {
  const page =
    props.body.page ?? (1 as number & tags.Type<"int32"> & tags.Minimum<1>);
  const limit =
    props.body.limit ??
    (20 as number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>);
  const skip = ((page as number) - 1) * (limit as number);
  // Determine target member ID
  // If memberId differs from authenticated user, verify moderator/owner status
  let targetMemberId: string & tags.Format<"uuid"> = props.member.id;
  if (
    props.body.memberId !== undefined &&
    props.body.memberId !== props.member.id
  ) {
    // User is querying another member's subscriptions
    // Must verify the authenticated user is a moderator or owner of the target community
    if (props.body.communityId === undefined) {
      throw new HttpException(
        "Cannot view another member's subscriptions without specifying community",
        403,
      );
    }
    const moderator =
      await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
        where: {
          reddit_clone_community_id: props.body.communityId,
          reddit_clone_member_id: props.member.id,
          role: { in: ["owner", "moderator"] },
        },
      });
    if (moderator === null) {
      throw new HttpException("Forbidden", 403);
    }
    targetMemberId = props.body.memberId;
  }
  // If communityName is provided, resolve to communityId
  let communityIdFilter: (string & tags.Format<"uuid">) | undefined =
    props.body.communityId;
  if (props.body.communityName !== undefined) {
    const community = await MyGlobal.prisma.reddit_clone_communities.findFirst({
      where: { name: props.body.communityName },
      select: { id: true },
    });
    if (community === null) {
      return {
        data: [],
        pagination: {
          current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
          limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
          records: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
          pages: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
        },
      };
    }
    communityIdFilter = community.id;
  }
  // Build date range condition if both are provided
  const dateRangeCondition = (() => {
    if (
      props.body.createdAfter !== undefined &&
      props.body.createdBefore !== undefined
    ) {
      return {
        AND: [
          {
            created_at: {
              gt: new Date(
                props.body.createdAfter as string & tags.Format<"date-time">,
              ),
            },
          },
          {
            created_at: {
              lt: new Date(
                props.body.createdBefore as string & tags.Format<"date-time">,
              ),
            },
          },
        ],
      } satisfies Prisma.reddit_clone_subscriptionsWhereInput;
    }
    if (props.body.createdAfter !== undefined) {
      return {
        created_at: {
          gt: new Date(
            props.body.createdAfter as string & tags.Format<"date-time">,
          ),
        },
      } satisfies Prisma.reddit_clone_subscriptionsWhereInput;
    }
    if (props.body.createdBefore !== undefined) {
      return {
        created_at: {
          lt: new Date(
            props.body.createdBefore as string & tags.Format<"date-time">,
          ),
        },
      } satisfies Prisma.reddit_clone_subscriptionsWhereInput;
    }
    return undefined;
  })();
  // Build WHERE clause
  const whereInput = {
    reddit_clone_member_id: targetMemberId,
    ...(communityIdFilter !== undefined && {
      reddit_clone_community_id: communityIdFilter,
    }),
    ...dateRangeCondition,
  } satisfies Prisma.reddit_clone_subscriptionsWhereInput;
  // Execute query with pagination - use sequential await
  const data = await MyGlobal.prisma.reddit_clone_subscriptions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...RedditClonePostTextContentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_subscriptions.count({
    where: whereInput,
  });
  // Transform results using transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditClonePostTextContentAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / (limit as number)) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
  };
}
