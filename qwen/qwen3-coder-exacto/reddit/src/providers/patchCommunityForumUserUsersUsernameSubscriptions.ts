import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunitySubscription";
import { IPageICommunityForumCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityForumCommunitySubscription";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchCommunityForumUserUsersUsernameSubscriptions(props: {
  user: UserPayload;
  username: string;
  body: ICommunityForumCommunitySubscription.IRequest;
}): Promise<IPageICommunityForumCommunitySubscription.ISummary> {
  // First, verify the user has permission to access this data
  // Users can only access their own subscriptions

  // Find the user by username to verify existence
  const targetUser = await MyGlobal.prisma.community_forum_users.findUnique({
    where: {
      username: props.username,
    },
  });

  if (!targetUser) {
    throw new HttpException("User not found", 404);
  }

  // Check if the authenticated user can access this data
  if (props.user.id !== targetUser.id) {
    // In a real implementation, we would check if the user is an admin
    // For now, we'll throw a forbidden error
    throw new HttpException(
      "Forbidden: Cannot access another user's subscriptions",
      403,
    );
  }

  // Parse pagination parameters
  const page = props.body.page;
  const limit = props.body.limit;
  const sortBy = props.body.sort_by || "created_at";
  const order = props.body.order || "desc";

  // Calculate pagination values
  const skip = (page - 1) * limit;

  // Build the orderBy clause
  let orderBy: Prisma.community_forum_subscriptionsOrderByWithRelationInput;

  switch (sortBy) {
    case "created_at":
      orderBy = { created_at: order };
      break;
    default:
      orderBy = { created_at: "desc" };
  }

  // Query for subscriptions, ensuring communities are not deleted
  const [subscriptions, total] = await Promise.all([
    MyGlobal.prisma.community_forum_subscriptions.findMany({
      where: {
        community_forum_user_id: targetUser.id,
        community: {
          deleted_at: null,
        },
      },
      include: {
        community: {
          select: {
            id: true,
            name: true,
            slug: true,
            title: true,
            description: true,
            privacy_level: true,
            status: true,
            member_count: true,
            post_count: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_forum_subscriptions.count({
      where: {
        community_forum_user_id: targetUser.id,
        community: {
          deleted_at: null,
        },
      },
    }),
  ]);

  // Transform the data to match the response format
  const data = subscriptions.map((sub) => ({
    id: sub.id,
    user: {
      id: sub.user.id,
      username: sub.user.username,
    },
    community: {
      id: sub.community.id,
      name: sub.community.name,
      slug: sub.community.slug,
      title: sub.community.title,
      description: sub.community.description,
      privacy_level: typia.assert<"public" | "private" | "restricted">(
        sub.community.privacy_level,
      ),
      status: typia.assert<"active" | "inactive" | "archived">(
        sub.community.status,
      ),
      member_count: sub.community.member_count,
      post_count: sub.community.post_count,
      created_at: toISOStringSafe(sub.community.created_at),
      updated_at: toISOStringSafe(sub.community.updated_at),
      deleted_at: sub.community.deleted_at
        ? toISOStringSafe(sub.community.deleted_at)
        : (null as unknown as string & tags.Format<"date-time">),
    },
    created_at: toISOStringSafe(sub.created_at),
  }));

  // Calculate pagination info
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };

  // Return the response
  return {
    pagination,
    data,
  };
}
